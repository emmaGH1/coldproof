import { findEvents } from "@/lib/shipment";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const events = await findEvents(new URL(request.url).searchParams);
    return Response.json({ events, count: events.length, limit: 1000 });
  } catch (error) {
    return Response.json({ error: error instanceof RangeError ? error.message : "Database unavailable" }, { status: error instanceof RangeError ? 400 : 503 });
  }
}
