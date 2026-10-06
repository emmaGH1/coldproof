import { createHash } from "node:crypto";
import fixture from "@/data/probe-shipment.json";

export type Reading = {
  sensorId: string;
  shipmentId: string;
  seq: number;
  ts: string;
  tempC: number;
  prevHash: string;
  blockId: string;
  isSolid: boolean | null;
  milestone: number | null;
};

export type Check = "pass" | "fail" | "unknown" | "na";

export type VerifiedReading = Reading & {
  checks: { solid: Check; content: Check; signature: Check; chain: Check };
  inBreach: boolean;
};

export const SAFE_RANGE = { min: 2, max: 8 } as const;
export const HORNET_URL = process.env.HORNET_URL ?? "http://localhost:14265";

const readings = fixture.readings as Reading[];

export function getShipment() {
  const first = readings[0];
  return {
    shipmentId: first.shipmentId,
    sensorId: first.sensorId,
    readings,
  };
}

export function canonical(r: Reading): string {
  const body = {
    prevHash: r.prevHash,
    sensorId: r.sensorId,
    seq: r.seq,
    shipmentId: r.shipmentId,
    tempC: r.tempC,
    ts: r.ts,
  };
  return JSON.stringify(body);
}

function sha256Hex(s: string) {
  return "0x" + createHash("sha256").update(s).digest("hex");
}

function chainCheck(list: Reading[], i: number): Check {
  if (i === 0) return list[0].seq === 1 ? "pass" : "fail";
  const prev = list[i - 1];
  const okSeq = list[i].seq === prev.seq + 1;
  const okHash = list[i].prevHash === sha256Hex(canonical(prev));
  return okSeq && okHash ? "pass" : "fail";
}

function hexToUtf8(hex: string) {
  return Buffer.from(hex.replace(/^0x/, ""), "hex").toString("utf8");
}

function sameContent(tangleData: string, r: Reading) {
  try {
    const onTangle = JSON.parse(tangleData) as Record<string, unknown>;
    const stored = JSON.parse(canonical(r)) as Record<string, unknown>;
    const keys = Object.keys(stored);
    return (
      Object.keys(onTangle).length === keys.length &&
      keys.every((k) => onTangle[k] === stored[k])
    );
  } catch {
    return false;
  }
}

async function hornetCheck(
  r: Reading,
): Promise<{ solid: Check; content: Check }> {
  try {
    const signal = AbortSignal.timeout(2500);
    const [meta, block] = await Promise.all([
      fetch(`${HORNET_URL}/api/core/v2/blocks/${r.blockId}/metadata`, {
        cache: "no-store",
        signal,
      }).then((res) => (res.ok ? res.json() : null)),
      fetch(`${HORNET_URL}/api/core/v2/blocks/${r.blockId}`, {
        cache: "no-store",
        signal,
      }).then((res) => (res.ok ? res.json() : null)),
    ]);
    if (!meta || !block) return { solid: "unknown", content: "unknown" };
    const data = block.payload?.data ? hexToUtf8(block.payload.data) : "";
    return {
      solid: meta.isSolid ? "pass" : "fail",
      content: sameContent(data, r) ? "pass" : "fail",
    };
  } catch {
    return { solid: "unknown", content: "unknown" };
  }
}

export function inBreach(r: Reading) {
  return r.tempC > SAFE_RANGE.max || r.tempC < SAFE_RANGE.min;
}

export async function getIncident(padding = 3) {
  const { readings: list } = getShipment();
  const breachIdx = list
    .map((r, i) => (inBreach(r) ? i : -1))
    .filter((i) => i >= 0);
  const from = Math.max(0, breachIdx[0] - padding);
  const to = Math.min(list.length - 1, breachIdx[breachIdx.length - 1] + padding);
  const window = list.slice(from, to + 1);
  const verified: VerifiedReading[] = await Promise.all(
    window.map(async (r, k) => {
      const h = await hornetCheck(r);
      return {
        ...r,
        inBreach: inBreach(r),
        checks: {
          solid: h.solid,
          content: h.content,
          signature: "na" as Check,
          chain: chainCheck(list, from + k),
        },
      };
    }),
  );
  const breach = verified.filter((r) => r.inBreach);
  return {
    events: verified,
    startTs: breach[0].ts,
    endTs: breach[breach.length - 1].ts,
    peak: Math.max(...breach.map((r) => r.tempC)),
    breachCount: breach.length,
  };
}
