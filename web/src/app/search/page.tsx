import Link from "next/link";
import { findEvents } from "@/lib/shipment";

export const dynamic = "force-dynamic";
const fields = [
  ["blockId", "Block ID", "0x…", "text"],
  ["tag", "Tag", "coldproof.coldchain", "text"],
  ["sensor", "Sensor", "PAL-0042-S1", "text"],
  ["from", "From (UTC)", "", "datetime-local"],
  ["to", "To (UTC)", "", "datetime-local"],
] as const;

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key] of fields) {
    const value = raw[key];
    if (typeof value === "string" && value) params.set(key, (key === "from" || key === "to") && !/(Z|[+-]\d\d:\d\d)$/.test(value) ? `${value}Z` : value);
  }
  let events: Awaited<ReturnType<typeof findEvents>> = [];
  let error = "";
  try { events = await findEvents(params); }
  catch (e) { error = e instanceof RangeError ? e.message : "Database unavailable. Start the local stack and try again."; }
  return (
    <main className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <Link href="/" className="text-lg font-semibold">coldproof</Link>
        <span className="font-mono text-[10px] text-muted-foreground">SIMULATED SENSOR · REAL TANGLE BLOCKS</span>
      </header>
      <section className="px-6 py-8">
        <p className="font-mono text-xs text-ice">RELATIONAL EVIDENCE INDEX</p>
        <h1 className="mt-2 text-4xl font-semibold">Find the reading. Check the witness.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Search stored records, then open a shipment to verify them against Hornet.</p>
        <form action="/search" className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {fields.map(([key, label, placeholder, type]) => (
            <label key={key} className="font-mono text-xs text-muted-foreground">
              {label}
              <input name={key} type={type} placeholder={placeholder} defaultValue={typeof raw[key] === "string" ? raw[key] as string : ""} className="mt-2 block h-10 w-full border border-hairline bg-background px-2 text-xs text-foreground outline-none focus:border-ice" />
            </label>
          ))}
          <button type="submit" className="mt-6 h-10 bg-ice px-4 text-sm font-medium text-background">Search</button>
        </form>
        <div className="mt-6 flex gap-6 font-mono text-xs">
          <Link href="/search" className="text-ice underline">Clear filters</Link>
          <a href={`/api/events?${params}`} className="text-ice underline">REST result</a>
          <span aria-live="polite">{events.length} records{events.length === 1000 ? " (first 1000)" : ""}</span>
        </div>
        {error && <p role="alert" className="mt-6 text-signal">{error}</p>}
        {!error && !events.length && <p className="mt-8 text-muted-foreground">No records match these filters.</p>}
      </section>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="border-y border-hairline text-muted-foreground"><tr>{["UTC", "Sensor", "Tag", "°C", "Seq", "Block / inspect"].map(t => <th key={t} className="px-6 py-3 font-normal">{t}</th>)}</tr></thead>
          <tbody>{events.map(r => (
            <tr key={r.blockId} className="border-b border-hairline hover:bg-accent">
              <td className="px-6 py-3">{r.ts.replace("T", " ")}</td>
              <td className="px-6">{r.sensorId}</td>
              <td className="px-6">{r.tag}</td>
              <td className={`px-6 ${r.tempC > 8 || r.tempC < 2 ? "text-signal" : "text-ice"}`}>{r.tempC.toFixed(2)}</td>
              <td className="px-6">{r.seq}</td>
              <td className="px-6"><Link className="text-ice underline" href={`/shipments/${encodeURIComponent(r.shipmentId)}?blockId=${r.blockId}`}>{r.blockId.slice(0, 12)}…{r.blockId.slice(-6)}</Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </main>
  );
}
