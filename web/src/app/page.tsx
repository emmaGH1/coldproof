import { HeroScreen } from "@/components/hero-screen";
import Link from "next/link";
import { getIncident, getShipment } from "@/lib/shipment";

export const dynamic = "force-dynamic";

export default async function Home() {
  const shipment = await getShipment();
  if (!shipment) return (
    <main className="flex min-h-dvh flex-col justify-center gap-6 px-8">
      <h1 className="text-5xl font-semibold">coldproof</h1>
      <p>No shipment data yet. Publish simulated readings through the Messages API to anchor real blocks.</p>
      <Link href="/search" className="text-ice underline">Search evidence</Link>
    </main>
  );
  const incident = await getIncident(shipment.shipmentId);
  const { shipmentId, sensorId } = shipment;
  const readings = incident!.all;
  const peakIndex = readings.reduce(
    (best, r, i) => (r.tempC > readings[best].tempC ? i : best),
    0,
  );
  return (
    <HeroScreen
      points={readings}
      shipmentId={shipmentId}
      sensorId={sensorId}
      solidCount={readings.filter((r) => r.checks.solid === "pass").length}
      peakIndex={peakIndex}
    />
  );
}
