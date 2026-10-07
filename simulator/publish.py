"""Deterministic simulated readings; real signatures, real Hornet blocks."""

import argparse
import hashlib
import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg
import requests
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

ROOT = Path(__file__).resolve().parent.parent
SENSOR = "PAL-0042-S1"
SHIPMENT = "SHP-VLC-2210"
TAG = "coldproof.coldchain"
GENESIS = "0x" + "0" * 64


def runtime():
    env = ROOT / ".local/runtime.env"
    values = dict(line.split("=", 1) for line in env.read_text().splitlines() if "=" in line)
    return {**values, **{k: v for k, v in os.environ.items() if k in values}}


def canonical(reading):
    return json.dumps(
        {k: v for k, v in reading.items() if k != "sig"},
        sort_keys=True, separators=(",", ":"), ensure_ascii=True,
    ).encode()


def sensor_key():
    path = ROOT / ".local/sensor-key"
    if not path.exists():
        key = Ed25519PrivateKey.generate()
        path.write_bytes(key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption()))
        os.chmod(path, 0o600)
    return Ed25519PrivateKey.from_private_bytes(path.read_bytes())


def readings(key):
    previous = GENESIS
    start = datetime(2026, 10, 6, tzinfo=timezone.utc)
    for i in range(96):
        temperature = round(480 + 25 * math.sin(i * 0.7))
        if 79 <= i <= 84:
            temperature = [836, 918, 994, 1024, 971, 872][i - 79]
        reading = {
            "sensorId": SENSOR, "shipmentId": SHIPMENT, "seq": i + 1,
            "ts": (start + timedelta(minutes=15 * i)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "tempCenti": temperature, "prevHash": previous,
        }
        body = canonical(reading)
        reading["sig"] = key.sign(body).hex()
        previous = "0x" + hashlib.sha256(body).hexdigest()
        yield reading


def seed():
    config = runtime()
    key = sensor_key()
    public = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex()
    with psycopg.connect(config["DATABASE_URL"]) as connection:
        existing = connection.execute("SELECT public_key FROM sensors WHERE sensor_id=%s", (SENSOR,)).fetchone()
        if existing and existing[0] != public:
            raise RuntimeError("Sensor already registered to a different key; do not replace the trust anchor")
        connection.execute("INSERT INTO sensors (sensor_id,public_key) VALUES (%s,%s) ON CONFLICT DO NOTHING", (SENSOR, public))
        existing_sequences = {row[0] for row in connection.execute("SELECT (data->>'seq')::int FROM events WHERE data->>'shipmentId'=%s AND data->>'sensorId'=%s", (SHIPMENT, SENSOR))}
    if existing_sequences:
        raise RuntimeError("Demo shipment already exists; use scripts/reset, not another seed")
    envelopes = []
    for reading in readings(key):
        response = requests.post(
            os.environ.get("MESSAGES_API_URL", "http://localhost:5555") + "/upload?node=iota-hornet",
            json={"tag": TAG, "message": reading},
            headers={"Authorization": "Bearer " + config["INGEST_TOKEN"]}, timeout=20,
        )
        response.raise_for_status()
        result = response.json()
        envelopes.append({"blockId": result["blockId"], "data": reading, "tag": TAG, "insertedAt": result["insertedAt"]})
        (ROOT / ".local/seed.json").write_text(json.dumps(envelopes, indent=2))
        print(f"{reading['seq']:02}/96 anchored {result['blockId']}, forwarded={result['forwarded']}", flush=True)
    print("96 simulated readings published. Each block ID came from Hornet.")


def mutate(action, sequence):
    config = runtime()
    with psycopg.connect(config["DATABASE_URL"]) as connection:
        if action == "tamper":
            cursor = connection.execute(
                "UPDATE events SET data=jsonb_set(data,'{tempCenti}','500'::jsonb) WHERE data->>'shipmentId'=%s AND (data->>'seq')::int=%s",
                (SHIPMENT, sequence),
            )
            print(f"Changed {cursor.rowcount} DB row(s) to 5.00 °C. No Tangle blocks changed.")
        elif action == "delete":
            cursor = connection.execute("DELETE FROM events WHERE data->>'shipmentId'=%s AND (data->>'seq')::int=%s", (SHIPMENT, sequence))
            print(f"Deleted {cursor.rowcount} DB row(s). No Tangle blocks changed.")
        elif action == "reset":
            envelopes = json.loads((ROOT / ".local/seed.json").read_text())
            for envelope in envelopes:
                connection.execute(
                    "INSERT INTO events (block_id,tag,inserted_at,data) VALUES (%s,%s,%s,%s::jsonb) ON CONFLICT(block_id) DO UPDATE SET data=excluded.data,tag=excluded.tag",
                    (envelope["blockId"], envelope["tag"], envelope["insertedAt"], json.dumps(envelope["data"])),
                )
            print(f"Restored {len(envelopes)} original DB rows; verification still reads real Hornet blocks.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["seed", "tamper", "delete", "reset"])
    parser.add_argument("--seq", type=int, default=83)
    args = parser.parse_args()
    seed() if args.action == "seed" else mutate(args.action, args.seq)
