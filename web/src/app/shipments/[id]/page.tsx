import { notFound } from "next/navigation";
import { IncidentWorkspace } from "@/components/incident-workspace";
import { HORNET_URL, getIncident, getShipment } from "@/lib/shipment";

export const dynamic = "force-dynamic";

export default async function ShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = getShipment();
  if (id !== shipment.shipmentId) notFound();
  const incident = await getIncident();
  return (
    <IncidentWorkspace
      shipmentId={shipment.shipmentId}
      sensorId={shipment.sensorId}
      all={shipment.readings}
      hornetUrl={HORNET_URL}
      {...incident}
    />
  );
}
