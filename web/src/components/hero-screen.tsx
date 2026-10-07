"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Trace, hhmm, shortId, type TracePoint } from "@/components/trace";
import { cn } from "@/lib/utils";

type Props = {
  points: TracePoint[];
  shipmentId: string;
  sensorId: string;
  solidCount: number;
  peakIndex: number;
};

export function HeroScreen({
  points,
  shipmentId,
  sensorId,
  solidCount,
  peakIndex,
}: Props) {
  const [active, setActive] = useState(peakIndex);
  const p = points[active];
  const out = p.tempC > 8 || p.tempC < 2;

  return (
    <main className="relative h-dvh min-h-[800px] w-full overflow-hidden bg-background sm:min-h-[640px]">
      <Trace
        points={points}
        active={active}
        onHover={setActive}
        className="absolute inset-x-0 top-[14%] bottom-0"
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-4 px-6 pt-6 sm:px-8">
        <div>
          <div className="text-lg font-semibold tracking-tight [font-stretch:125%]">coldproof</div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">SIMULATED SENSOR · REAL TANGLE BLOCKS</div>
          <Link href="/search" className="pointer-events-auto mt-3 inline-block text-xs text-ice underline underline-offset-4">Search evidence</Link>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right font-mono text-[11px] text-muted-foreground">
          <dt>shipment</dt>
          <dd className="text-foreground">{shipmentId}</dd>
          <dt>sensor</dt>
          <dd className="text-foreground">{sensorId}</dd>
          <dt>anchored</dt>
          <dd className="tabular text-foreground">
            {solidCount}/{points.length} solid on Hornet
          </dd>
        </dl>
      </header>

      <section className="pointer-events-none absolute top-[24%] right-6 left-6 max-w-[44rem] sm:top-[22%] sm:right-auto sm:left-8">
        <h1 className="text-[clamp(2.75rem,6.2vw,6rem)] leading-[0.92] font-semibold tracking-[-0.03em] [font-stretch:112%]">
          Every reading,
          <br />
          witnessed by
          <br />
          <span className="text-ice">the Tangle.</span>
        </h1>
        <p className="mt-6 max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground">
          Each line below is one temperature reading from pallet {sensorId},
          anchored as its own block on an Eclipse aeriOS IOTA node. When a
          shipment arrives warm and the logs disagree, coldproof checks every
          reading against the Tangle and shows you exactly which one was
          changed.
        </p>
        <Link
          href={`/shipments/${shipmentId}`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "pointer-events-auto mt-8 h-11 rounded-none px-5 text-[14px]",
          )}
        >
          Open the dock-3 excursion
          <ArrowRight data-icon="inline-end" />
        </Link>
      </section>

      <aside className="pointer-events-none absolute right-6 bottom-16 w-[19rem] border-t border-hairline bg-background/80 pt-3 backdrop-blur-[2px] sm:right-8">
        <div className="flex items-baseline justify-between font-mono text-[11px] text-muted-foreground">
          <span>
            seq {String(active + 1).padStart(3, "0")} · {hhmm(p.ts)} UTC
          </span>
          <span>milestone {p.milestone ?? "—"}</span>
        </div>
        <div
          className={cn(
            "tabular mt-1 font-mono text-6xl font-medium tracking-tight",
            out ? "text-signal" : "text-ice",
          )}
        >
          {p.tempC.toFixed(2)}
          <span className="ml-1 text-2xl text-muted-foreground">°C</span>
        </div>
        <div className="mt-2 font-mono text-[11px] break-all text-muted-foreground">
          block {shortId(p.blockId)}
        </div>
      </aside>

    </main>
  );
}
