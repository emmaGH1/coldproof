"""Fork of eclipse-aerios/iota-messages-api (Apache-2.0), with durable forwarding."""

import hmac
import json
import os
import re
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024
HORNET_URL = os.environ.get("HORNET_URL", "http://localhost:14265").rstrip("/")
TRACEABILITY_URL = os.environ.get("TRACEABILITY_URL", "http://localhost:3000/api/ingest")
TOKEN = os.environ.get("INGEST_TOKEN", "")
OUTBOX = Path(os.environ.get("OUTBOX_DIR", "outbox"))
OUTBOX.mkdir(parents=True, exist_ok=True)


def forward(path):
    try:
        envelope = json.loads(path.read_text())
        response = requests.post(
            TRACEABILITY_URL, json=envelope,
            headers={"Authorization": f"Bearer {TOKEN}"}, timeout=5,
        )
        response.raise_for_status()
        path.unlink(missing_ok=True)
        return True
    except (requests.RequestException, OSError, ValueError):
        return False


def retry_outbox():
    while True:
        for path in OUTBOX.glob("*.json"):
            forward(path)
        time.sleep(3)


threading.Thread(target=retry_outbox, daemon=True).start()


@app.post("/upload")
def post_clear():
    if not TOKEN or not hmac.compare_digest(
        request.headers.get("Authorization", ""), f"Bearer {TOKEN}"
    ):
        return jsonify(error="Publisher token required"), 401
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error="Expected a JSON object"), 400
    tag, message = body.get("tag"), body.get("message")
    if not isinstance(tag, str) or not 1 <= len(tag.encode()) <= 64 or not isinstance(message, dict):
        return jsonify(error="Expected tag (1–64 UTF-8 bytes) and message object"), 400
    if request.args.get("node") not in (None, "", "iota-hornet"):
        return jsonify(error="Only the configured Hornet node is supported"), 400
    message_text = json.dumps(message, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    payload = {
        "protocolVersion": 2,
        "payload": {"type": 5, "tag": "0x" + tag.encode().hex(), "data": "0x" + message_text.encode().hex()},
    }
    try:
        response = requests.post(f"{HORNET_URL}/api/core/v2/blocks", json=payload, timeout=10)
        response.raise_for_status()
        block_id = response.json().get("blockId")
        if not isinstance(block_id, str) or not re.fullmatch(r"0x[0-9a-f]{64}", block_id):
            return jsonify(error="Hornet returned no valid block ID"), 502
    except (requests.RequestException, ValueError):
        return jsonify(error="Hornet insertion failed"), 502
    envelope = {
        "blockId": block_id, "tag": tag, "data": message,
        "insertedAt": datetime.now(timezone.utc).isoformat(),
    }
    path = OUTBOX / f"{block_id}.json"
    temporary = OUTBOX / f"{uuid.uuid4().hex}.tmp"
    try:
        temporary.write_text(json.dumps(envelope))
        temporary.replace(path)
    except OSError:
        return jsonify(**envelope, forwarded=False, queued=False, error="Tangle insertion succeeded but forwarding outbox could not be saved; retain this receipt"), 202
    forwarded = forward(path)
    return jsonify(blockId=block_id, forwarded=forwarded, queued=not forwarded, insertedAt=envelope["insertedAt"]), 201 if forwarded else 202


@app.get("/health")
def health():
    return jsonify(service="messages-api-fork", queued=len(list(OUTBOX.glob("*.json"))))
