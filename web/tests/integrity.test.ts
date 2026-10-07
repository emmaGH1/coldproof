import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import {
  canonical, chainCheck, GENESIS_HASH, hash, parseMessage,
  sameContent, signatureCheck, verdict, type Message,
} from "../src/lib/integrity";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicHex = (publicKey.export({ format: "der", type: "spki" }) as Buffer).subarray(-32).toString("hex");
function reading(overrides: Partial<Message> = {}): Message {
  const r: Message = { sensorId: "TEST-S1", shipmentId: "SHP-TEST", seq: 1, ts: "2026-10-06T00:00:00Z", tempCenti: 500, prevHash: GENESIS_HASH, sig: "", ...overrides };
  r.sig = sign(null, Buffer.from(canonical(r)), privateKey).toString("hex");
  return r;
}
const first = reading();
const second = reading({ seq: 2, ts: "2026-10-06T00:15:00Z", prevHash: hash(first) });

test("canonical bytes use sorted keys, integer centi-degrees, and exclude signature", () => {
  assert.equal(canonical(first), `{"prevHash":"${GENESIS_HASH}","sensorId":"TEST-S1","seq":1,"shipmentId":"SHP-TEST","tempCenti":500,"ts":"2026-10-06T00:00:00Z"}`);
  assert.equal(canonical({ ...first, sig: "edited" }), canonical(first));
});
test("registered ed25519 signature passes, changed temperature fails", () => {
  assert.equal(signatureCheck(first, publicHex), "pass");
  assert.equal(signatureCheck({ ...first, tempCenti: 1024 }, publicHex), "fail");
  assert.equal(signatureCheck(first), "unknown");
  assert.equal(signatureCheck(first, "broken"), "fail");
});
test("chain detects gaps, replay, predecessor changes and wrong genesis", () => {
  assert.equal(chainCheck(first, [first, second]), "pass");
  assert.equal(chainCheck(second, [first, second]), "pass");
  assert.equal(chainCheck(second, [second]), "fail");
  assert.equal(chainCheck(second, [first, second, second]), "fail");
  assert.equal(chainCheck(second, [{ ...first, tempCenti: 1024 }, second]), "fail");
  assert.equal(chainCheck({ ...first, prevHash: hash(first) }, [first]), "fail");
});
test("content comparison ignores key order, not data or extra fields", () => {
  assert.equal(sameContent(first, Object.fromEntries(Object.entries(first).reverse())), true);
  assert.equal(sameContent(first, { ...first, tempCenti: 501 }), false);
  assert.equal(sameContent(first, { ...first, extra: true }), false);
});
test("schema rejects ambiguous numbers, fields, dates and identities", () => {
  assert.deepEqual(parseMessage(first), first);
  for (const invalid of [
    { ...first, tempCenti: 500.1 }, { ...first, seq: 0 }, { ...first, seq: Number.MAX_SAFE_INTEGER + 1 },
    { ...first, sensorId: "unsafe/../" }, { ...first, ts: "2026-02-30T00:00:00Z" },
    { ...first, sig: "bad" }, { ...first, extra: "untrusted" }, null,
  ]) assert.throws(() => parseMessage(invalid));
});
test("unsolid is pending, network failures are unverified, not tampering", () => {
  const good = { solid: "pass", content: "pass", signature: "pass", chain: "pass" } as const;
  assert.equal(verdict(good), "ANCHORED");
  assert.equal(verdict({ ...good, solid: "fail" }), "PENDING");
  assert.equal(verdict({ ...good, solid: "unknown", content: "unknown" }), "UNVERIFIED");
  assert.equal(verdict({ ...good, content: "fail" }), "TAMPERED");
  assert.equal(verdict({ ...good, signature: "fail" }), "TAMPERED");
  assert.equal(verdict({ ...good, chain: "fail" }), "CHAIN_BROKEN");
});
test("all 96 Python signatures and hashes verify in TypeScript", () => {
  const output = execFileSync("../.venv/bin/python", ["-c", `
import sys,json
sys.path.insert(0,"../simulator")
from publish import readings,canonical,Ed25519PrivateKey,serialization
k=Ed25519PrivateKey.generate()
r=list(readings(k))
print(json.dumps({"key":k.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw).hex(),"readings":r,"canonical":[canonical(x).decode() for x in r]}))
`], { encoding: "utf8" });
  const result = JSON.parse(output);
  assert.equal(result.readings.length, 96);
  result.readings.forEach((r: Message, i: number) => {
    assert.equal(canonical(r), result.canonical[i]);
    assert.equal(signatureCheck(r, result.key), "pass");
    assert.equal(chainCheck(r, result.readings), "pass");
  });
});
