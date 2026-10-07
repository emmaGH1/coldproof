"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Trace, hhmm, shortId } from "@/components/trace";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Check, VerifiedReading } from "@/lib/shipment";
import { cn } from "@/lib/utils";

const CHECKS = [
  ["solid", "Solid", "Hornet block metadata reports isSolid"],
  ["content", "Content", "Stored row equals the data in the Tangle block"],
  ["signature", "Sig", "ed25519 signature checked against the registered sensor public key"],
  ["chain", "Chain", "Sequence +1 and prevHash = SHA-256 of previous reading"],
] as const;

function Mark({ c }: { c: Check }) {
  const map: Record<Check, [string, string]> = {
    pass: ["OK", "text-ice"],
    fail: ["FAIL", "text-signal font-semibold"],
    unknown: ["?", "text-muted-foreground"],
    na: ["—", "text-muted-foreground/60"],
  };
  const [t, cls] = map[c];
  return <span className={cn("font-mono text-[11px]", cls)}>{t}</span>;
}

function verdict(r: VerifiedReading) {
  const labels: Record<string, [string, string]> = {
    TAMPERED: ["stored evidence fails content or signature verification", "signal"],
    CHAIN_BROKEN: ["missing, replayed or altered predecessor", "signal"],
    UNVERIFIED: ["one or more checks are unavailable", "muted"],
    PENDING: ["block is not yet solid", "muted"],
    ANCHORED: ["solid · content · signature · chain", "ice"],
  };
  const [sub, tone] = labels[r.verdict] ?? labels.UNVERIFIED;
  return { label: r.verdict, sub, tone };
}

type Props = {
  shipmentId: string;
  sensorId: string;
  all: VerifiedReading[];
  events: VerifiedReading[];
  startTs: string;
  endTs: string;
  peak: number;
  breachCount: number;
  selectedBlock?: string;
};

export function IncidentWorkspace(initial: Props) {
  const [props, setProps] = useState(initial);
  const [pollError, setPollError] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(`/api/shipments/${encodeURIComponent(initial.shipmentId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Verification unavailable");
        const next = await response.json();
        if (active) { setProps(next); setPollError(false); setCheckedAt(new Date().toISOString().slice(11, 19)); }
      } catch { if (active) setPollError(true); }
      if (active) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);
    return () => { active = false; clearTimeout(timer); };
  }, [initial.shipmentId]);
  const { events, all } = props;
  const peakIdx = events.findIndex((e) => e.tempC === props.peak);
  const [selectedId, setSelectedId] = useState(initial.selectedBlock ?? events[Math.max(0, peakIdx)]?.blockId);
  const selected = all.find(e => e.blockId === selectedId);
  const r = selected ?? events[0];
  if (!r) return <main className="p-8">No events remain in this shipment. Restore the dataset with the reset script.</main>;
  const sel = events.findIndex(e => e.blockId === r.blockId);
  const v = verdict(r);
  const allIdx = all.findIndex((a) => a.blockId === r.blockId);
  const verifiedCount = events.filter(
    (e) => e.verdict === "ANCHORED",
  ).length;

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-4 border-b border-hairline px-6 py-3 font-mono text-[12px]">
        <Link href="/" className="font-sans text-base font-semibold tracking-tight [font-stretch:125%]">
          coldproof
        </Link>
        <span className="text-muted-foreground">
          {props.shipmentId} / {props.sensorId} / excursion
        </span>
        <Link href="/search" className="ml-auto text-ice underline underline-offset-4">Search evidence</Link>
      </header>
      <div role="status" className="flex flex-wrap justify-between gap-2 border-b border-hairline px-6 py-2 font-mono text-[10px] text-muted-foreground">
        <span>SIMULATED SENSOR · REAL TANGLE BLOCKS · LIVE VERIFICATION EVERY 5s</span>
        <span className={pollError ? "text-signal" : ""}>{pollError ? "REFRESH FAILED · showing previous results" : checkedAt ? `Checked ${checkedAt} UTC` : "Verified on page load"}</span>
      </div>

      <section className="grid grid-cols-1 items-end gap-6 border-b border-hairline px-6 pt-8 pb-6 md:grid-cols-[1fr_auto]">
        <div>
          <div className="font-mono text-[11px] tracking-wider text-signal uppercase">
            {props.breachCount ? "Temperature excursion · dock 3" : "No temperature excursion"}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight [font-stretch:112%] xl:text-4xl">
            {hhmm(props.startTs)}–{hhmm(props.endTs)} UTC, peak{" "}
            <span className="text-signal tabular">{props.peak.toFixed(2)} °C</span>
          </h1>
        </div>
        <dl className="grid grid-cols-3 gap-x-10 font-mono text-[11px] text-muted-foreground">
          <div>
            <dt>out of range</dt>
            <dd className="tabular mt-1 text-2xl text-foreground">{props.breachCount}</dd>
          </div>
          <div>
            <dt>in this view</dt>
            <dd className="tabular mt-1 text-2xl text-foreground">{events.length}</dd>
          </div>
          <div>
            <dt>all four checks pass</dt>
            <dd className="tabular mt-1 text-2xl text-ice">
              {verifiedCount}/{events.length}
            </dd>
          </div>
        </dl>
      </section>

      <Trace
        points={all.map(e => ({ ...e, tampered: e.verdict === "TAMPERED" }))}
        active={allIdx}
        onSelect={(i) => {
          setSelectedId(all[i].blockId);
        }}
        labelEvery={16}
        className="h-44 border-b border-hairline"
      />

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="overflow-auto">
          <table className="w-full min-w-[36rem] font-mono text-[12px]">
            <thead className="sticky top-0 bg-background text-left text-[10px] tracking-wider text-muted-foreground uppercase">
              <tr className="border-b border-hairline">
                <th className="py-2 pl-6 font-normal">UTC</th>
                <th className="font-normal">°C</th>
                <th className="font-normal">seq</th>
                <th className="font-normal">block</th>
                {CHECKS.map(([k, label, help]) => (
                  <th key={k} className="font-normal">
                    <Tooltip>
                      <TooltipTrigger className="cursor-help uppercase underline decoration-dotted underline-offset-4">
                        {label}
                      </TooltipTrigger>
                      <TooltipContent>{help}</TooltipContent>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr
                  key={e.blockId}
                  onClick={() => setSelectedId(e.blockId)}
                  className={cn(
                    "cursor-pointer border-b border-hairline/60 hover:bg-accent/60",
                    i === sel && "bg-accent",
                    e.verdict === "TAMPERED" && "bg-signal/10",
                  )}
                >
                  <td
                    className={cn(
                      "tabular border-l-2 py-2 pl-[22px]",
                      e.inBreach ? "border-signal" : "border-transparent",
                    )}
                  >
                    {hhmm(e.ts)}
                  </td>
                  <td className={cn("tabular", e.inBreach ? "text-signal" : "text-ice")}>
                    {e.tempC.toFixed(2)}
                  </td>
                  <td className="tabular text-muted-foreground">{e.seq}</td>
                  <td><button className="text-muted-foreground underline decoration-dotted underline-offset-4" onClick={() => setSelectedId(e.blockId)} aria-label={`Inspect reading ${e.seq}`}>{shortId(e.blockId)}</button></td>
                  {CHECKS.map(([k]) => (
                    <td key={k}>
                      <Mark c={e.checks[k]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="border-l border-hairline px-6 py-6">
          <div className="font-mono text-[11px] text-muted-foreground">
            seq {r.seq} · {r.ts.replace("T", " ").replace("Z", " UTC")}
          </div>
          <div
            className={cn(
              "tabular mt-2 font-mono text-7xl font-medium tracking-tight",
              r.inBreach ? "text-signal" : "text-ice",
            )}
          >
            {r.tempC.toFixed(2)}
            <span className="ml-1 text-2xl text-muted-foreground">°C</span>
          </div>

          <div
            className={cn(
              "mt-8 inline-block -rotate-2 border-2 px-4 py-2 font-mono",
              v.tone === "ice" && "border-ice text-ice",
              v.tone === "signal" && "border-signal text-signal",
              v.tone === "muted" && "border-muted-foreground text-muted-foreground",
            )}
          >
            <div className="text-2xl font-bold tracking-[0.2em]">{v.label}</div>
            <div className="text-[10px] tracking-wider uppercase">{v.sub}</div>
          </div>
          {r.lookupNote && <p className="mt-4 text-xs text-muted-foreground">{r.lookupNote}</p>}

          <dl className="mt-8 space-y-4 font-mono text-[11px]">
            <div>
              <dt className="text-muted-foreground">block id</dt>
              <dd className="mt-1 break-all text-foreground">{r.blockId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">referenced by milestone</dt>
              <dd className="tabular mt-1 text-foreground">{r.milestone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">prev hash</dt>
              <dd className="mt-1 break-all text-foreground/80">{r.prevHash}</dd>
            </div>
          </dl>

          <a
            href={`/api/events/${r.blockId}/block`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] text-ice underline-offset-4 hover:underline"
          >
            Raw block on Hornet <ExternalLink className="size-3" />
          </a>
          {r.difference.length > 0 && (
            <section className="mt-6 border-t border-signal pt-4" aria-label="Mismatch evidence">
              <h2 className="font-mono text-xs text-signal">DATABASE ≠ TANGLE</h2>
              {r.difference.map(d => (
                <div key={d.field} className="mt-3 font-mono text-xs">
                  <div className="text-muted-foreground">{d.field === "tempCenti" ? "Temperature" : d.field}</div>
                  <div className="mt-1 break-all text-signal">DB: {d.field === "tempCenti" ? `${(Number(d.stored) / 100).toFixed(2)} °C` : JSON.stringify(d.stored)}</div>
                  <div className="mt-1 break-all text-ice">Tangle: {d.field === "tempCenti" ? `${(Number(d.tangle) / 100).toFixed(2)} °C` : JSON.stringify(d.tangle)}</div>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
