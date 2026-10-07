import { verifyBlock } from "@/lib/shipment";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  try {
    const event = await verifyBlock((await params).blockId);
    return event ? Response.json(event) : Response.json({ error: "Event not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof RangeError ? error.message : "Database unavailable" }, { status: error instanceof RangeError ? 400 : 503 });
  }
}
