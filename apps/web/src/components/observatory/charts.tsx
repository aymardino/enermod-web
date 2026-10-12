"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import type { YearRow } from "@/lib/api";
import { cn } from "@/lib/utils";

const TOOLTIP_STYLE = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 12 };
const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" };

/** Studies per publication year, optionally stacked by model scope. */
export function YearBars({ rows, stacked = false, height = 260, labels }: { rows: YearRow[]; stacked?: boolean; height?: number; labels: { studies: string; full: string; light: string } }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
          {stacked ? (
            <>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="full" name={labels.full} stackId="a" fill="var(--full)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="light" name={labels.light} stackId="a" fill="var(--light)" radius={[3, 3, 0, 0]} />
            </>
          ) : (
            <Bar dataKey="studies" name={labels.studies} fill="var(--brand-600)" radius={[3, 3, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars with direct labels: one value per row, single hue unless a colour is given per row. */
export function RowBars({ rows, max, className, format, color = "var(--brand-500)" }: { rows: { label: string; value: number; hint?: string; color?: string; href?: string }[]; max?: number; className?: string; format?: (v: number) => string; color?: string }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={cn("space-y-2", className)}>
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,160px)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={r.label}>{r.href ? <a href={r.href} className="hover:text-primary hover:underline">{r.label}</a> : r.label}</span>
          <div className="h-2.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.value / m) * 100)}%`, background: r.color ?? color }} /></div>
          <span className="tabular text-xs text-muted-foreground">{r.hint ?? (format ? format(r.value) : r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Coverage columns (percent of assessed studies) with the median as a dotted reference. */
export function CoverageBars({ rows, median, height = 260 }: { rows: { label: string; pct: number; positive: number; assessed: number }[]; median?: number; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} formatter={(v, _n, p) => [`${v}% (${p.payload.positive}/${p.payload.assessed})`, ""]} />
          <Bar dataKey="pct" fill="var(--coral-500)" radius={[3, 3, 0, 0]} label={{ position: "top", fontSize: 11, fill: "var(--foreground)", formatter: (v: unknown) => `${v}%` }} />
          {median !== undefined && <ReferenceLineShim y={median} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// recharts' ReferenceLine typed import kept separate so the chart above stays readable
import { ReferenceLine } from "recharts";
function ReferenceLineShim({ y }: { y: number }) {
  return <ReferenceLine y={y} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: `${y}%`, position: "right", fontSize: 11, fill: "var(--muted-foreground)" }} />;
}

/** Distribution columns (counts per bucket) in a single hue. */
export function Columns({ rows, height = 220, color = "var(--brand-600)", unit = "" }: { rows: { label: string; value: number }[]; height?: number; color?: string; unit?: string }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={0} unit={unit} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} label={{ position: "top", fontSize: 11, fill: "var(--foreground)" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const REGION_COLORS: Record<string, string> = { north: "#1565C0", west: "#2E7D32", east: "#6A1B9A", central: "#E65100", southern: "#37474F" };

/** Readiness vs gap, one dot per country, coloured by region. */
export function ReadinessScatter({ rows, height = 320, regionLabel, xLabel, yLabel }: { rows: { name: string; region: string; readiness: number; gap: number; studies: number }[]; height?: number; regionLabel: (r: string) => string; xLabel: string; yLabel: string }) {
  const regions = Array.from(new Set(rows.map((r) => r.region)));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
          <CartesianGrid stroke="var(--border)" />
          <XAxis dataKey="readiness" type="number" name={xLabel} domain={[0, 10]} tick={AXIS} tickLine={false} label={{ value: xLabel, position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis dataKey="gap" type="number" name={yLabel} domain={[0, 100]} tick={AXIS} tickLine={false} label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }} />
          <ZAxis dataKey="studies" range={[40, 260]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} formatter={(v, n) => [v, n]} labelFormatter={() => ""} content={({ payload }) => {
            const p = payload?.[0]?.payload as { name: string; readiness: number; gap: number; studies: number } | undefined;
            if (!p) return null;
            return <div style={TOOLTIP_STYLE} className="px-2 py-1"><b>{p.name}</b><br />{xLabel}: {p.readiness} · {yLabel}: {p.gap}<br />{p.studies} studies</div>;
          }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {regions.map((r) => (
            <Scatter key={r} name={regionLabel(r)} data={rows.filter((x) => x.region === r)} fill={REGION_COLORS[r] ?? "var(--brand-600)"} fillOpacity={0.85}>
              {rows.filter((x) => x.region === r).map((x) => <Cell key={x.name} fill={REGION_COLORS[r] ?? "var(--brand-600)"} />)}
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny inline sparkline (studies per year) for tables. */
export function Sparkline({ values, width = 96, height = 24, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  const max = Math.max(1, ...values);
  const w = width / Math.max(1, values.length);
  return (
    <svg width={width} height={height} className={cn("block", className)} aria-hidden="true">
      {values.map((v, i) => {
        const h = (v / max) * (height - 2);
        return <rect key={i} x={i * w + 1} y={height - h} width={Math.max(1, w - 2)} height={h} rx={1} fill={v ? "var(--brand-500)" : "var(--border)"} />;
      })}
    </svg>
  );
}

/** Horizontal share bar (African-led / mixed / non-African). */
export function OriginBar({ origin, labels }: { origin: { african_led: number; mixed: number; non_african: number; assessed: number }; labels: { african_led: string; mixed: string; non_african: string } }) {
  const parts = [
    { key: "african_led", value: origin.african_led, color: "var(--brand-600)" },
    { key: "mixed", value: origin.mixed, color: "#1565C0" },
    { key: "non_african", value: origin.non_african, color: "#9E9E9E" },
  ] as const;
  const total = origin.assessed || 1;
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-md bg-muted" role="img">
        {parts.filter((p) => p.value > 0).map((p, i) => (
          <div key={p.key} title={`${labels[p.key]}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color, marginLeft: i ? 2 : 0 }} className="h-full min-w-[2px]" />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <li key={p.key} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: p.color }} /><span className="text-foreground">{labels[p.key]}</span><span className="tabular">{p.value} · {Math.round((p.value / total) * 100)}%</span></li>
        ))}
      </ul>
    </div>
  );
}
