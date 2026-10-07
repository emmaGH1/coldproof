import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db().query("SELECT 1");
    const response = await fetch(`${process.env.HORNET_URL ?? "http://localhost:14265"}/api/core/v2/info`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error("Hornet unavailable");
    const info = await response.json();
    const latest = info.status?.latestMilestone;
    const confirmed = info.status?.confirmedMilestone;
    const synced = latest?.index === confirmed?.index && Number(latest?.index) > 0 && Math.abs(Date.now() / 1000 - Number(latest?.timestamp)) < 60;
    return Response.json({
      database: "ok", hornet: synced ? "synced" : "syncing",
      isHealthy: info.status?.isHealthy === true, milestone: confirmed?.index,
      network: info.protocol?.networkName,
    }, { status: synced ? 200 : 503 });
  } catch {
    return Response.json({ status: "unavailable", error: "Database or Hornet unavailable" }, { status: 503 });
  }
}
