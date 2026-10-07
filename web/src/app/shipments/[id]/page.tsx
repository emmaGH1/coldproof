import { notFound } from "next/navigation";
import { IncidentWorkspace } from "@/components/incident-workspace";
import { getIncident } from "@/lib/shipment";

export const dynamic = "force-dynamic";

export default async function ShipmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ blockId?: string }>;
}) {
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) notFound();
  const { blockId } = await searchParams;
  return (
    <IncidentWorkspace
      {...incident}
      selectedBlock={blockId}
    />
  );
}
