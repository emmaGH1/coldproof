import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { canonical, GENESIS_HASH } from "../src/lib/integrity";
import { verifyReading, type Reading } from "../src/lib/shipment";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const key = (publicKey.export({ format: "der", type: "spki" }) as Buffer).subarray(-32).toString("hex");
const r: Reading = { sensorId: "S", shipmentId: "X", seq: 1, ts: "2026-10-06T00:00:00Z", tempCenti: 1024, prevHash: GENESIS_HASH, sig: "", blockId: "0x" + "a".repeat(64), tag: "coldproof", insertedAt: "2026-10-06T00:00:00Z", tempC: 10.24, isSolid: null, milestone: null };
r.sig = sign(null, Buffer.from(canonical(r)), privateKey).toString("hex");
const { sensorId, shipmentId, seq, ts, tempCenti, prevHash, sig } = r;
const original = { sensorId, shipmentId, seq, ts, tempCenti, prevHash, sig };
const originalFetch = global.fetch;
test.afterEach(() => { global.fetch = originalFetch; });

function mockHornet(isSolid: boolean) {
  global.fetch = async (url) => Response.json(String(url).endsWith("/metadata")
    ? { isSolid, referencedByMilestoneIndex: 42 }
    : { payload: { type: 5, tag: "0x" + Buffer.from(r.tag).toString("hex"), data: "0x" + Buffer.from(JSON.stringify(original)).toString("hex") } });
}
test("unit: solid and content endpoints yield all-four pass", async () => {
  mockHornet(true);
  const result = await verifyReading(r, [r], key);
  assert.equal(result.verdict, "ANCHORED");
  assert.equal(result.milestone, 42);
});
test("unit: changed DB value returns original Tangle evidence", async () => {
  mockHornet(true);
  const changed = { ...r, tempCenti: 500, tempC: 5 };
  const result = await verifyReading(changed, [changed], key);
  assert.equal(result.verdict, "TAMPERED");
  assert.deepEqual(result.difference, [{ field: "tempCenti", stored: 500, tangle: 1024 }]);
  assert.equal(result.checks.signature, "fail");
});
test("unit: Hornet outage never reuses old verification", async () => {
  global.fetch = async () => { throw new Error("offline"); };
  const result = await verifyReading(r, [r], key);
  assert.equal(result.verdict, "UNVERIFIED");
  assert.equal(result.checks.content, "unknown");
  assert.equal(result.checks.solid, "unknown");
});
test("unit: unsolid block is pending, not tampered", async () => {
  mockHornet(false);
  assert.equal((await verifyReading(r, [r], key)).verdict, "PENDING");
});
test("unit: pruned or missing block is unverified, not evidence of an edit", async () => {
  global.fetch = async () => new Response(null, { status: 404 });
  const result = await verifyReading(r, [r], key);
  assert.equal(result.verdict, "UNVERIFIED");
  assert.match(result.lookupNote!, /pruned/);
});
test("unit: content comparison includes extra fields inserted into the DB JSON", async () => {
  mockHornet(true);
  const changed = { ...r, rawData: { ...original, extra: "tampered" } };
  const result = await verifyReading(changed, [changed], key);
  assert.equal(result.verdict, "TAMPERED");
  assert.deepEqual(result.difference, [{ field: "extra", stored: "tampered", tangle: null }]);
});
