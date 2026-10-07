import { db } from "@/lib/db";
import {
  BLOCK_ID, chainCheck, sameContent, signatureCheck, verdict,
  type Check, type Message,
} from "@/lib/integrity";

export type { Check } from "@/lib/integrity";
export type Reading = Message & {
  tempC: number;
  blockId: string;
  tag: string;
  insertedAt: string;
  isSolid: boolean | null;
  milestone: number | null;
  rawData?: Message;
};
export type VerifiedReading = Reading & {
  checks: { solid: Check; content: Check; signature: Check; chain: Check };
  inBreach: boolean;
  verdict: string;
  tangle: unknown;
  stored: Message;
  difference: { field: string; stored: unknown; tangle: unknown }[];
  lookupNote: string | null;
};

export const SAFE_RANGE = { min: 2, max: 8 } as const;
export const HORNET_URL = process.env.HORNET_URL ?? "http://localhost:14265";

type Row = { block_id: string; tag: string; inserted_at: Date; data: Message };
function fromRow(row: Row): Reading {
  return { ...row.data, rawData: row.data, blockId: row.block_id, tag: row.tag, insertedAt: row.inserted_at.toISOString(), tempC: row.data.tempCenti / 100, isSolid: null, milestone: null };
}
export async function findEvents(params = new URLSearchParams()) {
  const clauses: string[] = [];
  const values: string[] = [];
  for (const [key, column] of [
    ["blockId", "block_id"], ["tag", "tag"], ["sensor", "data->>'sensorId'"], ["shipment", "data->>'shipmentId'"],
  ]) {
    const value = params.get(key);
    if (value) { values.push(value); clauses.push(`${column} = $${values.length}`); }
  }
  for (const [key, op] of [["from", ">="], ["to", "<="]]) {
    const value = params.get(key);
    if (value) {
      if (!Number.isFinite(Date.parse(value))) throw new RangeError(`Invalid ${key} date`);
      values.push(value);
      clauses.push(`(data->>'ts')::timestamptz ${op} $${values.length}::timestamptz`);
    }
  }
  const result = await db().query<Row>(
    `SELECT * FROM events ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY data->>'ts', (data->>'seq')::bigint LIMIT 1000`,
    values,
  );
  return result.rows.map(fromRow);
}

export function inBreach(r: Reading) {
  return r.tempC > SAFE_RANGE.max || r.tempC < SAFE_RANGE.min;
}

export async function verifyReading(r: Reading, list: Reading[], trustedKey?: string): Promise<VerifiedReading> {
  const { sensorId, shipmentId, seq, ts, tempCenti, prevHash, sig } = r;
  const stored: Message = r.rawData ?? { sensorId, shipmentId, seq, ts, tempCenti, prevHash, sig };
  let solid: Check = "unknown", content: Check = "unknown";
  let tangle: unknown = null, milestone: number | null = null, isSolid: boolean | null = null;
  let tagOnTangle: string | null = null;
  const read = async (suffix: string) => {
    try {
      const res = await fetch(`${HORNET_URL}/api/core/v2/blocks/${r.blockId}${suffix}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
      return { status: res.status, body: res.ok ? await res.json() : null };
    } catch { return { status: 0, body: null }; }
  };
  const [meta, block] = await Promise.all([read("/metadata"), read("")]);
  if (meta.body && typeof meta.body.isSolid === "boolean") {
    isSolid = meta.body.isSolid;
    solid = isSolid ? "pass" : "fail";
    milestone = meta.body.referencedByMilestoneIndex ?? null;
  }
  const lookupNote = block.status === 404
    ? "Block not found on this node; it may be pruned or belong to another network. No content verdict is claimed."
    : !block.body || !meta.body ? "Hornet lookup unavailable; no complete verification verdict is claimed."
    : isSolid && milestone === null ? "Solid on this node, but not yet referenced by a milestone. ANCHORED does not claim ledger finality." : null;
  if (block.body) {
    try {
      const payload = block.body.payload;
      tangle = JSON.parse(Buffer.from(payload.data.replace(/^0x/, ""), "hex").toString("utf8"));
      tagOnTangle = Buffer.from(payload.tag.replace(/^0x/, ""), "hex").toString("utf8");
      content = sameContent(stored, tangle) && r.tag === tagOnTangle ? "pass" : "fail";
    } catch { content = "fail"; }
  }
  const checks = { solid, content, signature: signatureCheck(stored, trustedKey), chain: chainCheck(stored, list) };
  const onTangle = tangle && typeof tangle === "object" ? tangle as Record<string, unknown> : {};
  const difference = content === "fail" ? Object.entries(stored)
    .filter(([key, value]) => value !== onTangle[key])
    .map(([field, value]) => ({ field, stored: value, tangle: onTangle[field] ?? null })) : [];
  if (tagOnTangle !== null && r.tag !== tagOnTangle) difference.push({ field: "tag", stored: r.tag, tangle: tagOnTangle });
  return { ...r, isSolid, milestone, stored, tangle, checks, verdict: verdict(checks), difference, lookupNote, inBreach: inBreach(r) };
}

export async function getVerified(list: Reading[]) {
  const sensors = await db().query<{ sensor_id: string; public_key: string }>("SELECT * FROM sensors");
  const keys = new Map(sensors.rows.map(s => [s.sensor_id, s.public_key]));
  const verified: VerifiedReading[] = [];
  for (let i = 0; i < list.length; i += 12) {
    verified.push(...await Promise.all(list.slice(i, i + 12).map(r => verifyReading(r, list, keys.get(r.sensorId)))));
  }
  return verified;
}

export async function getShipment(id?: string) {
  const params = new URLSearchParams();
  if (!id) {
    const first = await db().query<{ shipment_id: string }>("SELECT data->>'shipmentId' AS shipment_id FROM events ORDER BY received_at LIMIT 1");
    id = first.rows[0]?.shipment_id;
  }
  if (!id) return null;
  params.set("shipment", id);
  const readings = await findEvents(params);
  if (!readings.length) return null;
  return { shipmentId: readings[0].shipmentId, sensorId: readings[0].sensorId, readings };
}

export async function getIncident(id: string) {
  const shipment = await getShipment(id);
  if (!shipment) return null;
  const all = await getVerified(shipment.readings);
  const breach = all.filter(inBreach);
  const first = breach.length ? Math.max(0, all.indexOf(breach[0]) - 3) : 0;
  const last = breach.length ? Math.min(all.length, all.indexOf(breach.at(-1)!) + 4) : all.length;
  return {
    ...shipment, all, events: all.slice(first, last),
    startTs: (breach[0] ?? all[0]).ts,
    endTs: (breach.at(-1) ?? all.at(-1)!).ts,
    peak: Math.max(...all.map(r => r.tempC)),
    breachCount: breach.length,
  };
}

export async function verifyBlock(blockId: string) {
  if (!BLOCK_ID.test(blockId)) throw new RangeError("Invalid block ID");
  const events = await findEvents(new URLSearchParams({ blockId }));
  if (!events.length) return null;
  const r = events[0];
  const list = await findEvents(new URLSearchParams({ shipment: r.shipmentId, sensor: r.sensorId }));
  const key = await db().query<{ public_key: string }>("SELECT public_key FROM sensors WHERE sensor_id=$1", [r.sensorId]);
  return verifyReading(r, list, key.rows[0]?.public_key);
}
