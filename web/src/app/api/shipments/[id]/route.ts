import { getIncident } from "@/lib/shipment";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const incident = await getIncident((await params).id);
    return incident ? Response.json(incident) : Response.json({ error: "Shipment not found" }, { status: 404 });
  } catch { return Response.json({ error: "Database unavailable" }, { status: 503 }); }
}
