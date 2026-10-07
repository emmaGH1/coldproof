import { createHash, createPublicKey, verify } from "node:crypto";

export const GENESIS_HASH = "0x" + "0".repeat(64);
export const BLOCK_ID = /^0x[0-9a-f]{64}$/;
export type Check = "pass" | "fail" | "unknown" | "na";
export type Message = {
  sensorId: string;
  shipmentId: string;
  seq: number;
  ts: string;
  tempCenti: number;
  prevHash: string;
  sig: string;
};

export function canonical(r: Message): string {
  return JSON.stringify({
    prevHash: r.prevHash, sensorId: r.sensorId, seq: r.seq,
    shipmentId: r.shipmentId, tempCenti: r.tempCenti, ts: r.ts,
  });
}

export function hash(r: Message) {
  return "0x" + createHash("sha256").update(canonical(r)).digest("hex");
}

export function parseMessage(value: unknown): Message {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a reading object");
  const r = value as Record<string, unknown>;
  const keys = ["prevHash", "sensorId", "seq", "shipmentId", "sig", "tempCenti", "ts"];
  if (Object.keys(r).sort().join(",") !== keys.join(",")) throw new Error("Reading fields do not match the schema");
  for (const k of ["sensorId", "shipmentId"]) {
    if (typeof r[k] !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(r[k])) throw new Error(`Invalid ${k}`);
  }
  if (!Number.isSafeInteger(r.seq) || Number(r.seq) < 1) throw new Error("Invalid sequence");
  if (!Number.isSafeInteger(r.tempCenti) || Math.abs(Number(r.tempCenti)) > 100000) throw new Error("Invalid temperature");
  if (typeof r.ts !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(r.ts) || !Number.isFinite(Date.parse(r.ts)) || new Date(r.ts).toISOString().replace(".000Z", "Z") !== r.ts) throw new Error("Expected a valid UTC timestamp");
  if (typeof r.prevHash !== "string" || !BLOCK_ID.test(r.prevHash)) throw new Error("Invalid previous hash");
  if (typeof r.sig !== "string" || !/^[0-9a-f]{128}$/.test(r.sig)) throw new Error("Invalid ed25519 signature");
  return r as Message;
}

export function signatureCheck(r: Message, trustedKey?: string): Check {
  if (!trustedKey) return "unknown";
  try {
    const key = createPublicKey({
      key: Buffer.from("302a300506032b6570032100" + trustedKey, "hex"),
      format: "der", type: "spki",
    });
    return verify(null, Buffer.from(canonical(r)), key, Buffer.from(r.sig, "hex")) ? "pass" : "fail";
  } catch { return "fail"; }
}

export function chainCheck(r: Message, list: Message[]): Check {
  const sameSensor = list.filter(p => p.sensorId === r.sensorId && p.shipmentId === r.shipmentId);
  if (sameSensor.filter(p => p.seq === r.seq).length !== 1) return "fail";
  if (r.seq === 1) return r.prevHash === GENESIS_HASH ? "pass" : "fail";
  const previous = sameSensor.filter(p => p.seq === r.seq - 1);
  return previous.length === 1 && r.prevHash === hash(previous[0]) ? "pass" : "fail";
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameContent(stored: Message, onTangle: unknown) {
  return stableJson(stored) === stableJson(onTangle);
}

export function verdict(checks: Record<"solid" | "content" | "signature" | "chain", Check>) {
  if (checks.content === "fail" || checks.signature === "fail") return "TAMPERED";
  if (checks.chain === "fail") return "CHAIN_BROKEN";
  if (Object.values(checks).some(c => c === "unknown" || c === "na")) return "UNVERIFIED";
  if (checks.solid === "fail") return "PENDING";
  return "ANCHORED";
}
