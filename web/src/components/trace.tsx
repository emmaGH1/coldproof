"use client";

import { cn } from "@/lib/utils";

export type TracePoint = {
  ts: string;
  tempC: number;
  blockId: string;
  milestone: number | null;
};

type TraceProps = {
  points: TracePoint[];
  active?: number;
  onHover?: (i: number) => void;
  onSelect?: (i: number) => void;
  domain?: [number, number];
  safe?: { min: number; max: number };
  labelEvery?: number;
  showLimits?: boolean;
  className?: string;
};

const VB = 1000;

export function shortId(id: string) {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function hhmm(ts: string) {
  return ts.slice(11, 16);
}

export function Trace({
  points,
  active,
  onHover,
  onSelect,
  domain = [0, 12],
  safe = { min: 2, max: 8 },
  labelEvery = 12,
  showLimits = true,
  className,
}: TraceProps) {
  const n = points.length;
  const x = (i: number) => ((i + 0.5) / n) * VB;
  const y = (t: number) => (1 - (t - domain[0]) / (domain[1] - domain[0])) * VB;
  const pct = (v: number) => `${(v / VB) * 100}%`;
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(2)} ${y(p.tempC).toFixed(2)}`)
    .join(" ");
  const out = (t: number) => t > safe.max || t < safe.min;
  const a = active !== undefined ? points[active] : undefined;

  return (
    <div className={cn("relative select-none", className)}>
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <clipPath id="above-limit">
            <rect x="0" y="0" width={VB} height={y(safe.max)} />
          </clipPath>
        </defs>
        {points.map((p, i) => (
          <line
            key={p.blockId}
            x1={x(i)}
            x2={x(i)}
            y1={y(p.tempC)}
            y2={VB}
            vectorEffect="non-scaling-stroke"
            stroke={out(p.tempC) ? "var(--signal)" : "var(--ice)"}
            strokeOpacity={i === active ? 0.9 : out(p.tempC) ? 0.32 : 0.14}
            strokeWidth={1}
          />
        ))}
        {showLimits &&
          [safe.max, safe.min].map((t) => (
            <line
              key={t}
              x1={0}
              x2={VB}
              y1={y(t)}
              y2={y(t)}
              vectorEffect="non-scaling-stroke"
              stroke="var(--foreground)"
              strokeOpacity={0.22}
              strokeDasharray="2 6"
            />
          ))}
        <path
          d={path}
          fill="none"
          stroke="var(--ice)"
          strokeWidth={1.75}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        <path
          d={path}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={2.25}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          clipPath="url(#above-limit)"
        />
      </svg>

      {showLimits && (
        <div
          className="absolute right-3 -translate-y-full pb-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase"
          style={{ top: pct(y(safe.max)) }}
        >
          {safe.max} °C limit
        </div>
      )}

      {a && active !== undefined && (
        <div
          className={cn(
            "pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 ring-4 ring-background",
            out(a.tempC) ? "bg-signal" : "bg-ice",
          )}
          style={{ left: pct(x(active)), top: pct(y(a.tempC)) }}
        />
      )}

      <div className="absolute inset-0 flex">
        {points.map((p, i) => (
          <button
            key={p.blockId}
            type="button"
            aria-label={`${hhmm(p.ts)} UTC, ${p.tempC} °C, block ${shortId(p.blockId)}`}
            className="h-full flex-1 cursor-crosshair outline-none focus-visible:bg-ice/10"
            onMouseEnter={() => onHover?.(i)}
            onFocus={() => onHover?.(i)}
            onClick={() => onSelect?.(i)}
          />
        ))}
      </div>

      {labelEvery > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <div
                key={p.blockId}
                className="absolute bottom-2 border-l border-hairline pl-1.5 font-mono text-[10px] leading-tight text-muted-foreground"
                style={{ left: pct(x(i)) }}
              >
                <div className="tabular text-foreground/70">{hhmm(p.ts)}</div>
                <div>{shortId(p.blockId)}</div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
