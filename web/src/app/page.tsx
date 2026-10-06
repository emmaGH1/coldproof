import { HeroScreen } from "@/components/hero-screen";
import { getShipment } from "@/lib/shipment";

export default function Home() {
  const { shipmentId, sensorId, readings } = getShipment();
  const peakIndex = readings.reduce(
    (best, r, i) => (r.tempC > readings[best].tempC ? i : best),
    0,
  );
  return (
    <HeroScreen
      points={readings}
      shipmentId={shipmentId}
      sensorId={sensorId}
      solidCount={readings.filter((r) => r.isSolid).length}
      peakIndex={peakIndex}
    />
  );
}
