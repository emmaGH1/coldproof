import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { BLOCK_ID, parseMessage, sameContent, signatureCheck } from "@/lib/integrity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = process.env.INGEST_TOKEN;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  if (!token || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let envelope, data;
  try {
    envelope = await request.json();
    data = parseMessage(envelope.data);
    if (typeof envelope.blockId !== "string" || !BLOCK_ID.test(envelope.blockId) || typeof envelope.tag !== "string" || Buffer.byteLength(envelope.tag) < 1 || Buffer.byteLength(envelope.tag) > 64 || typeof envelope.insertedAt !== "string" || !Number.isFinite(Date.parse(envelope.insertedAt))) throw new Error("Invalid ingest envelope");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid JSON" }, { status: 400 });
  }
  try {
    const sensors = await db().query<{ public_key: string }>("SELECT public_key FROM sensors WHERE sensor_id=$1", [data.sensorId]);
    if (signatureCheck(data, sensors.rows[0]?.public_key) !== "pass") return Response.json({ error: "Sensor is not registered or signature is invalid" }, { status: 400 });
    const result = await db().query(
      "INSERT INTO events (block_id, tag, inserted_at, data) VALUES ($1,$2,$3,$4) ON CONFLICT (block_id) DO NOTHING RETURNING block_id",
      [envelope.blockId, envelope.tag, envelope.insertedAt, JSON.stringify(data)],
    );
    if (!result.rowCount) {
      const existing = await db().query("SELECT data,tag FROM events WHERE block_id=$1", [envelope.blockId]);
      if (!existing.rows[0] || existing.rows[0].tag !== envelope.tag || !sameContent(data, existing.rows[0].data)) {
        return Response.json({ error: "Block ID already has different stored evidence; verify before restoring it" }, { status: 409 });
      }
    }
    return Response.json({ blockId: envelope.blockId, inserted: result.rowCount === 1 }, { status: result.rowCount ? 201 : 200 });
  } catch {
    return Response.json({ error: "Database unavailable; forwarder will retry" }, { status: 503 });
  }
}
