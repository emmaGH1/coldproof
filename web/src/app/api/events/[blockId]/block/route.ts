import { BLOCK_ID } from "@/lib/integrity";
import { HORNET_URL } from "@/lib/shipment";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const { blockId } = await params;
  if (!BLOCK_ID.test(blockId)) return Response.json({ error: "Invalid block ID" }, { status: 400 });
  try {
    const response = await fetch(`${HORNET_URL}/api/core/v2/blocks/${blockId}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!response.ok) return Response.json({ error: "Block unavailable" }, { status: response.status });
    return Response.json(await response.json());
  } catch { return Response.json({ error: "Hornet unreachable" }, { status: 503 }); }
}
