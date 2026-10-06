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
    <main className="relative h-dvh min-h-[640px] w-full overflow-hidden bg-background">
      <Trace
        points={points}
        active={active}
        onHover={setActive}
        className="absolute inset-x-0 top-[14%] bottom-0"
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-8 pt-6">
        <div className="text-lg font-semibold tracking-tight [font-stretch:125%]">
          coldproof
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

      <section className="pointer-events-none absolute top-[22%] left-8 max-w-[44rem]">
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

      <aside className="pointer-events-none absolute right-8 bottom-16 w-[19rem] border-t border-hairline bg-background/80 pt-3 backdrop-blur-[2px]">
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
