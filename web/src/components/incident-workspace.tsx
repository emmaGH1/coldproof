"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Trace, hhmm, shortId } from "@/components/trace";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Check, Reading, VerifiedReading } from "@/lib/shipment";
import { cn } from "@/lib/utils";

const CHECKS = [
  ["solid", "Solid", "Hornet block metadata reports isSolid"],
  ["content", "Content", "Stored row equals the data in the Tangle block"],
  ["signature", "Sig", "ed25519 signature from the sensor key (build phase)"],
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
  const { solid, content, chain } = r.checks;
  if ([solid, content, chain].includes("fail"))
    return { label: "TAMPERED", sub: "database disagrees with the Tangle", tone: "signal" };
  if ([solid, content].includes("unknown"))
    return { label: "UNVERIFIED", sub: "Hornet node unreachable", tone: "muted" };
  return { label: "ANCHORED", sub: "solid · content matches · chain intact", tone: "ice" };
}

type Props = {
  shipmentId: string;
  sensorId: string;
  all: Reading[];
  events: VerifiedReading[];
  startTs: string;
  endTs: string;
  peak: number;
  breachCount: number;
  hornetUrl: string;
};

export function IncidentWorkspace(props: Props) {
  const { events, all } = props;
  const peakIdx = events.findIndex((e) => e.tempC === props.peak);
  const [sel, setSel] = useState(Math.max(0, peakIdx));
  const r = events[sel];
  const v = verdict(r);
  const allIdx = all.findIndex((a) => a.blockId === r.blockId);
  const verifiedCount = events.filter(
    (e) => e.checks.solid === "pass" && e.checks.content === "pass",
  ).length;

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center gap-6 border-b border-hairline px-6 py-3 font-mono text-[12px]">
        <Link href="/" className="font-sans text-base font-semibold tracking-tight [font-stretch:125%]">
          coldproof
        </Link>
        <span className="text-muted-foreground">
          {props.shipmentId} / {props.sensorId} / excursion
        </span>
      </header>

      <section className="grid grid-cols-[1fr_auto] items-end gap-8 border-b border-hairline px-6 pt-8 pb-6">
        <div>
          <div className="font-mono text-[11px] tracking-wider text-signal uppercase">
            Temperature excursion · dock 3
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight [font-stretch:112%]">
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
            <dt>verified on Hornet now</dt>
            <dd className="tabular mt-1 text-2xl text-ice">
              {verifiedCount}/{events.length}
            </dd>
          </div>
        </dl>
      </section>

      <Trace
        points={all}
        active={allIdx}
        onSelect={(i) => {
          const k = events.findIndex((e) => e.blockId === all[i].blockId);
          if (k >= 0) setSel(k);
        }}
        labelEvery={16}
        className="h-44 border-b border-hairline"
      />

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_24rem]">
        <div className="overflow-auto">
          <table className="w-full font-mono text-[12px]">
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
                  onClick={() => setSel(i)}
                  className={cn(
                    "cursor-pointer border-b border-hairline/60 hover:bg-accent/60",
                    i === sel && "bg-accent",
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
                  <td className="text-muted-foreground">{shortId(e.blockId)}</td>
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
            href={`${props.hornetUrl}/api/core/v2/blocks/${r.blockId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] text-ice underline-offset-4 hover:underline"
          >
            Raw block on Hornet <ExternalLink className="size-3" />
          </a>
        </aside>
      </div>
    </main>
  );
}
