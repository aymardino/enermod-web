"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from "recharts";
import type { YearRow } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Key } from "@/components/ui/badge";
import { AFRICA_COUNTRIES } from "@/components/observatory/study-card";
import { cn } from "@/lib/utils";

/* ── shared chart styling ──────────────────────────────────────────────────────────── */

export const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
  fontFamily: "var(--font-sans)",
  fontVariantNumeric: "tabular-nums",
} as const;
export const TOOLTIP_STYLE: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  color: "var(--foreground)",
  fontSize: 12.5,
  boxShadow: "var(--shadow-pop)",
  padding: "6px 9px",
};
export const CURSOR = { fill: "var(--muted)" };
/** First tooltip line: the year, or "NGA · WAPP". */
const TIP_HEAD: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--muted-foreground)", lineHeight: 1.4 };
const DIRECT_LABEL: CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, fill: "var(--foreground)", fontVariantNumeric: "tabular-nums" };

const CURRENT_YEAR = new Date().getFullYear();

/** What our tooltip renderers read from recharts' content props. */
type TipArgs = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

/** Width of an element, from a ResizeObserver (0 until measured). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round axis step (1, 2, 5 × 10ⁿ) giving about `target` gridlines up to `max`. */
function niceStep(max: number, target = 3) {
  const raw = Math.max(max, 1) / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return Math.max(1, (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p);
}
function valueTicks(max: number, target = 3) {
  const step = niceStep(max, target);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let v = step; v <= top + 1e-9; v += step) ticks.push(v);
  return { ticks, top };
}
function useNumber() {
  const locale = useLocale();
  return useMemo(() => {
    const nf = new Intl.NumberFormat(locale);
    const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    return {
      locale,
      n: (v: number) => nf.format(v),
      /** axis figures: compact from 1K */
      axis: (v: number) => (Math.abs(v) >= 1000 ? compact.format(v) : nf.format(v)),
      /** 0–100 value as a percentage ("58 %" in French) */
      pct: (v: number) => pct.format(v / 100),
    };
  }, [locale]);
}

/** Top-rounded bar path: 2px at the data end, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0 || w <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  if (rr <= 0) return `M${x},${y + h}V${y}H${x + w}V${y + h}Z`;
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

type Series = "full" | "light" | "ink";
const SERIES_COLOR: Record<Series, string> = { full: "var(--full)", light: "var(--light)", ink: "var(--mark-ink)" };

/* ── YearBars ─────────────────────────────────────────────────────────────────────────────── */

type YearDatum = { year: number; studies: number; full: number; light: number; total: number };

/** Legend keys for the year chart: full square, half-filled square, hatched partial year.
 *  Rendered above the plot by YearBars; exported for headers that carry the legend on the right. */
export function YearLegend({
  labels,
  partialYear,
  stacked = true,
  className,
}: {
  labels: { full: string; light: string; partial?: string };
  partialYear?: number | null;
  stacked?: boolean;
  className?: string;
}) {
  const t = useTranslations("ui.chart");
  return (
    <div className={cn("flex flex-wrap gap-x-[18px] gap-y-1.5 text-[12.5px] leading-tight text-foreground", className)}>
      {stacked && (
        <>
          <span className="inline-flex items-center gap-[7px]"><Key kind="full" size="lg" />{labels.full}</span>
          <span className="inline-flex items-center gap-[7px]"><Key kind="light" size="lg" />{labels.light}</span>
        </>
      )}
      {partialYear ? (
        <span className="inline-flex items-center gap-[7px] text-muted-foreground">
          {stacked ? (
            <Key kind="partial" size="lg" />
          ) : (
            <span aria-hidden className="size-3 flex-none bg-[repeating-linear-gradient(45deg,var(--mark-ink)_0_1.3px,var(--background)_1.3px_3.4px)] shadow-[inset_0_0_0_1px_var(--mark-ink)]" />
          )}
          {labels.partial ?? t("yearToDate", { year: String(partialYear) })}
        </span>
      ) : null}
    </div>
  );
}

/** Studies per publication year. Stacked: whole energy-system (deep lapis) at the base,
 *  focused (mid lapis) above, 2px paper gap, 2px rounded data end; the current, partial year is
 *  hatched with a 1px outline. Direct labels on the last complete year and the partial year only.
 *  Not stacked: one ink series. Missing years are filled with zeros so the time axis is true. */
export function YearBars({
  rows,
  stacked = false,
  height = 260,
  labels,
  partialYear,
  years,
  legend,
  directLabels = true,
  labelYears,
  ariaLabel,
  className,
}: {
  rows: YearRow[];
  stacked?: boolean;
  /** plot height in px (the legend sits above it) */
  height?: number;
  labels: { studies: string; full: string; light: string; partial?: string };
  /** year drawn hatched; default the current calendar year when it is in the data; null = none */
  partialYear?: number | null;
  /** x extent, e.g. [2001, 2026]; default the data's first and last year */
  years?: [number, number];
  /** legend above the plot; default: shown when stacked or when a partial year is hatched */
  legend?: boolean;
  directLabels?: boolean;
  /** years to label; default the last complete year and the partial year */
  labelYears?: number[];
  ariaLabel?: string;
  className?: string;
}) {
  const t = useTranslations("ui.chart");
  const num = useNumber();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>();

  const data = useMemo<YearDatum[]>(() => {
    if (!rows.length) return [];
    const by = new Map(rows.map((r) => [r.year, r]));
    const lo = years?.[0] ?? Math.min(...rows.map((r) => r.year));
    const hi = years?.[1] ?? Math.max(...rows.map((r) => r.year));
    const out: YearDatum[] = [];
    for (let y = lo; y <= hi; y++) {
      const r = by.get(y);
      const full = r?.full ?? 0, light = r?.light ?? 0, studies = r?.studies ?? 0;
      out.push({ year: y, studies, full, light, total: stacked ? full + light : studies });
    }
    return out;
  }, [rows, years, stacked]);

  const py = partialYear === undefined ? (data.some((d) => d.year === CURRENT_YEAR) ? CURRENT_YEAR : null) : partialYear;
  const labelled = useMemo(() => {
    if (!directLabels) return new Set<number>();
    if (labelYears) return new Set(labelYears);
    const complete = data.filter((d) => d.year !== py && d.total > 0 && (py === null || d.year < py));
    const last = complete[complete.length - 1]?.year;
    return new Set([last, py].filter((y): y is number => typeof y === "number"));
  }, [data, directLabels, labelYears, py]);

  const { ticks: yTicks, top } = valueTicks(Math.max(0, ...data.map((d) => d.total)));
  const narrow = width > 0 && width < 480;
  const first = data[0]?.year ?? 0;
  const xTicks = data
    .map((d) => d.year)
    .filter((y) => (narrow ? y === first || (y % 10 === 0 && y - first >= 5) : (y - first) % 5 === 0));
  const showLegend = legend ?? (stacked || py !== null);

  const shape = (series: Series) =>
    function Segment(p: BarShapeProps) {
      const d = p.payload as YearDatum;
      const { x, y, width: w, height: h } = p;
      if (!d || !(h > 0)) return <g />;
      const isTop = series !== "full" || d.light === 0;
      // 2px paper gap between the stacked segments: 1px off each side of the joint
      const top = series === "full" && d.light > 0 ? 1 : 0;
      const bottom = series === "light" && d.full > 0 ? 1 : 0;
      const yy = y + top, hh = h - top - bottom;
      if (hh <= 0) return <g />;
      const partial = d.year === py;
      const color = SERIES_COLOR[series];
      return (
        <g>
          <path d={barPath(x, yy, w, hh, isTop ? 2 : 0)} fill={partial ? `url(#yb-${series}-${uid})` : color} stroke={partial ? color : "none"} strokeWidth={partial ? 1 : 0} />
          {isTop && labelled.has(d.year) && (
            <text x={x + w / 2} y={y - 6} textAnchor="middle" style={DIRECT_LABEL}>
              {num.n(d.total)}
            </text>
          )}
        </g>
      );
    };

  const tip = (p: TipArgs) => {
    const d = p.payload?.[0]?.payload as YearDatum | undefined;
    if (!p.active || !d) return null;
    return (
      <div style={TOOLTIP_STYLE}>
        <p style={TIP_HEAD}>
          {d.year}
          {d.year === py ? ` · ${labels.partial ?? t("yearToDate", { year: String(d.year) })}` : ""}
        </p>
        {stacked ? (
          <>
            <p className="flex items-center gap-[7px]"><Key kind="full" />{labels.full}<b className="ml-auto pl-3 font-semibold tabular-nums">{num.n(d.full)}</b></p>
            <p className="flex items-center gap-[7px]"><Key kind="light" />{labels.light}<b className="ml-auto pl-3 font-semibold tabular-nums">{num.n(d.light)}</b></p>
          </>
        ) : (
          <p className="flex items-center gap-3">{labels.studies}<b className="ml-auto font-semibold tabular-nums">{num.n(d.studies)}</b></p>
        )}
      </div>
    );
  };

  return (
    <div className={cn("w-full min-w-0", className)}>
      {showLegend && <YearLegend labels={labels} partialYear={py} stacked={stacked} className="mb-2.5" />}
      <div ref={wrapRef} style={{ height }} className="w-full" role="img" aria-label={ariaLabel ?? t("byYear")}>
        {data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: 0 }} barCategoryGap="19%" accessibilityLayer={false}>
              <defs>
                {(["full", "light", "ink"] as const).map((s) => (
                  <pattern key={s} id={`yb-${s}-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="4" height="4" fill="var(--background)" />
                    <line x1="0" y1="0" x2="0" y2="4" stroke={SERIES_COLOR[s]} strokeWidth="1.8" />
                  </pattern>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="year" ticks={xTicks} interval={0} tickLine={false} axisLine={{ stroke: "var(--rule)" }} tick={AXIS_TICK} tickMargin={6} />
              <YAxis width={36} axisLine={false} tickLine={false} tick={AXIS_TICK} ticks={yTicks} domain={[0, top]} allowDecimals={false} tickFormatter={num.axis} />
              <Tooltip cursor={CURSOR} content={(p) => tip(p)} isAnimationActive={false} />
              {stacked ? (
                <>
                  <Bar dataKey="full" name={labels.full} stackId="s" maxBarSize={24} isAnimationActive={false} shape={shape("full")} />
                  <Bar dataKey="light" name={labels.light} stackId="s" maxBarSize={24} isAnimationActive={false} shape={shape("light")} />
                </>
              ) : (
                <Bar dataKey="studies" name={labels.studies} maxBarSize={24} isAnimationActive={false} shape={shape("ink")} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ── RowBars, CoverageBars ────────────────────────────────────────────────────────────────── */

export type RowBarDatum = {
  label: string;
  value: number;
  /** text of the value column (default: the formatted value) */
  hint?: string;
  /** @deprecated single series are ink; accepted and ignored */
  color?: string;
  href?: string;
  /** extra detail for screen readers and the row's title ("12 of 52 assessed studies") */
  detail?: string;
};

/** Horizontal ink bars in HTML: rows 34px, a 9px ink bar with a 2px rounded end and no track,
 *  the value right-aligned, the list opened by a 1px ink rule, hairlines between rows. One series,
 *  so no legend: the block title names it. */
export function RowBars({
  rows,
  max,
  className,
  format,
  unit,
  median,
  medianLabel,
  labelWidth = "default",
  ariaLabel,
}: {
  rows: RowBarDatum[];
  max?: number;
  className?: string;
  format?: (v: number) => string;
  /** @deprecated single series are ink; accepted and ignored */
  color?: string;
  /** "%": values are 0–100 and print as percentages for the locale */
  unit?: "%";
  /** dashed median marker across the rows (same scale as the values) */
  median?: number;
  /** label over the marker; default "median 23%" */
  medianLabel?: string;
  /** label column: default 9.5em, wide 13em (feature names) */
  labelWidth?: "default" | "wide";
  ariaLabel?: string;
}) {
  const t = useTranslations("ui.chart");
  const num = useNumber();
  const m = max ?? Math.max(1, ...rows.map((r) => r.value), median ?? 0);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / m) * 100))}%`;
  const valueText = (r: RowBarDatum) => r.hint ?? (format ? format(r.value) : unit === "%" ? num.pct(r.value) : num.n(r.value));
  const grid =
    labelWidth === "wide"
      ? "grid-cols-[minmax(0,13em)_minmax(0,1fr)_minmax(34px,auto)] max-md:grid-cols-[minmax(0,10em)_minmax(0,1fr)_minmax(34px,auto)]"
      : "grid-cols-[minmax(0,9.5em)_minmax(0,1fr)_minmax(34px,auto)]";
  const medianPos = median !== undefined ? pct(median) : undefined;
  const medianRight = median !== undefined && median / m > 0.7;
  return (
    <div className={cn("min-w-0", className)}>
      {median !== undefined && (
        <div className={cn("grid h-6 items-end gap-3", grid)}>
          <span />
          <span className="relative h-full">
            <span
              className={cn(
                "absolute bottom-1.5 whitespace-nowrap font-display text-[12.5px] leading-none text-muted-foreground",
                medianRight ? "-translate-x-full pr-1.5" : "pl-1.5",
              )}
              style={{ left: medianPos }}
            >
              {medianLabel ?? t("median", { value: unit === "%" ? num.pct(median) : num.n(median) })}
            </span>
            <i aria-hidden className="absolute bottom-0 top-3 w-px bg-[repeating-linear-gradient(to_bottom,var(--foreground)_0_4px,transparent_4px_7px)]" style={{ left: medianPos }} />
          </span>
          <span />
        </div>
      )}
      <ol className="border-t border-rule" aria-label={ariaLabel}>
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className={cn("grid h-[34px] items-center gap-3 border-b border-border text-sm", grid)} title={r.detail}>
            {r.href ? (
              <Link href={r.href} title={r.label} className="block truncate py-[7px] decoration-link underline-offset-[3px] hover:text-link hover:underline">
                {r.label}
              </Link>
            ) : (
              <span className="truncate" title={r.label}>
                {r.label}
              </span>
            )}
            <span aria-hidden className="relative h-[9px]">
              {r.value > 0 && <i className="absolute inset-y-0 left-0 min-w-px rounded-r-[2px] bg-mark-ink" style={{ width: pct(r.value) }} />}
              {medianPos && <i className="absolute -inset-y-[13px] w-px bg-[repeating-linear-gradient(to_bottom,var(--foreground)_0_4px,transparent_4px_7px)]" style={{ left: medianPos }} />}
            </span>
            <span className="text-right text-[13px] tabular-nums text-muted-foreground">
              {valueText(r)}
              {r.detail && <span className="sr-only">, {r.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Feature coverage (percent of assessed studies) as RowBars with a % value column and an
 *  optional dashed median marker. */
export function CoverageBars({
  rows,
  median,
  className,
  medianLabel,
  ariaLabel,
}: {
  rows: { label: string; pct: number; positive: number; assessed: number }[];
  median?: number;
  /** @deprecated rows are 34px each; accepted and ignored */
  height?: number;
  className?: string;
  medianLabel?: string;
  ariaLabel?: string;
}) {
  const t = useTranslations("ui.chart");
  const num = useNumber();
  return (
    <RowBars
      className={className}
      rows={rows.map((r) => ({ label: r.label, value: r.pct, detail: t("ofAssessed", { positive: num.n(r.positive), assessed: num.n(r.assessed) }) }))}
      max={100}
      unit="%"
      median={median}
      medianLabel={medianLabel}
      labelWidth="wide"
      ariaLabel={ariaLabel}
    />
  );
}

/* ── Columns ──────────────────────────────────────────────────────────────────────────────── */

/** Distribution columns (counts per bucket), one ink series, values on top when there are
 *  few columns. */
export function Columns({
  rows,
  height = 220,
  unit = "",
  ariaLabel,
  className,
}: {
  rows: { label: string; value: number }[];
  height?: number;
  /** @deprecated single series are ink; accepted and ignored */
  color?: string;
  /** appended to the bucket labels ("%" gets the French narrow space) */
  unit?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const num = useNumber();
  const u = unit === "%" && num.locale.startsWith("fr") ? " %" : unit;
  const few = rows.length <= 16;
  const { ticks, top } = valueTicks(Math.max(0, ...rows.map((r) => r.value)));
  const shape = (p: BarShapeProps) => {
    const { x, y, width: w, height: h } = p;
    const d = p.payload as { value: number } | undefined;
    if (!d || !(h > 0)) return <g />;
    return (
      <g>
        <path d={barPath(x, y, w, h, 2)} fill="var(--mark-ink)" />
        {few && (
          <text x={x + w / 2} y={y - 6} textAnchor="middle" style={DIRECT_LABEL}>
            {num.n(d.value)}
          </text>
        )}
      </g>
    );
  };
  const tip = (p: TipArgs) => {
    const d = p.payload?.[0]?.payload as { label: string; value: number } | undefined;
    if (!p.active || !d) return null;
    return (
      <div style={TOOLTIP_STYLE}>
        <p style={TIP_HEAD}>{d.label}{u}</p>
        <p className="font-semibold tabular-nums">{num.n(d.value)}</p>
      </div>
    );
  };
  return (
    <div style={{ height }} className={cn("w-full min-w-0", className)} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 20, right: 12, bottom: 0, left: 0 }} barCategoryGap="18%" accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--rule)" }}
            interval={few ? 0 : "preserveStartEnd"}
            tickFormatter={(v: string) => `${v}${u}`}
            tickMargin={6}
          />
          <YAxis width={36} tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} ticks={ticks} domain={[0, top]} tickFormatter={num.axis} />
          <Tooltip cursor={CURSOR} content={(p) => tip(p)} isAnimationActive={false} />
          <Bar dataKey="value" maxBarSize={24} isAnimationActive={false} shape={shape} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── ReadinessScatter: small multiples by region ──────────────────────────────────────────── */

const REGION_ORDER = ["north", "west", "central", "east", "southern"];
const NAME_TO_ISO3: Record<string, string> = Object.fromEntries(
  Object.values(AFRICA_COUNTRIES).flatMap((c) => [[c.en.toLowerCase(), c.iso3], [c.fr.toLowerCase(), c.iso3]]),
);
const ISO3_POOL: Record<string, string> = Object.fromEntries(Object.values(AFRICA_COUNTRIES).map((c) => [c.iso3, c.pool]));

type ScatterRow = { name: string; region: string; readiness: number; gap: number; studies: number; iso3?: string };

type Placed = { x: number; y: number; text: string; anchor: "start" | "end" | "middle"; dy: string };
/** Greedy direct labelling for a small scatter: points that coincide share one label
 *  ("SSD · ERI"); each label tries eight slots around its dot (right, left, above, below, and the
 *  four corners) and takes the first that clears the other dots, the labels already placed and the
 *  plot edges, or else the least crowded one. */
function placeLabels(
  targets: { x: number; y: number; text: string }[],
  dots: { x: number; y: number }[],
  box: { x0: number; y0: number; x1: number; y1: number },
): Placed[] {
  const groups: { x: number; y: number; texts: string[] }[] = [];
  for (const t of targets) {
    const g = groups.find((q) => Math.hypot(q.x - t.x, q.y - t.y) < 5);
    if (g) g.texts.push(t.text);
    else groups.push({ x: t.x, y: t.y, texts: [t.text] });
  }
  type Box = { l: number; r: number; t: number; b: number };
  const taken: Box[] = [];
  const out: Placed[] = [];
  for (const g of groups) {
    const text = g.texts.join(" · ");
    const w = text.length * 7.4, h = 11;
    // cost: labels already placed weigh most, then other dots, then leaving the plot
    const cost = (a: Box) =>
      taken.filter((q) => a.l < q.r && a.r > q.l && a.t < q.b && a.b > q.t).length * 3 +
      dots.filter((d) => Math.hypot(d.x - g.x, d.y - g.y) >= 5 && d.x + 4 > a.l && d.x - 4 < a.r && d.y + 4 > a.t && d.y - 4 < a.b).length +
      (a.l < box.x0 || a.r > box.x1 || a.t < box.y0 || a.b > box.y1 ? 5 : 0);
    const options: (Placed & { box: Box })[] = [
      { x: g.x + 7, y: g.y, anchor: "start", dy: "0.35em", text, box: { l: g.x + 7, r: g.x + 7 + w, t: g.y - h / 2, b: g.y + h / 2 } },
      { x: g.x - 7, y: g.y, anchor: "end", dy: "0.35em", text, box: { l: g.x - 7 - w, r: g.x - 7, t: g.y - h / 2, b: g.y + h / 2 } },
      { x: g.x, y: g.y - 7, anchor: "middle", dy: "0", text, box: { l: g.x - w / 2, r: g.x + w / 2, t: g.y - 7 - h, b: g.y - 7 } },
      { x: g.x, y: g.y + 7, anchor: "middle", dy: "0.8em", text, box: { l: g.x - w / 2, r: g.x + w / 2, t: g.y + 7, b: g.y + 7 + h } },
      { x: g.x - 3, y: g.y - 7, anchor: "start", dy: "0", text, box: { l: g.x - 3, r: g.x - 3 + w, t: g.y - 7 - h, b: g.y - 7 } },
      { x: g.x + 3, y: g.y - 7, anchor: "end", dy: "0", text, box: { l: g.x + 3 - w, r: g.x + 3, t: g.y - 7 - h, b: g.y - 7 } },
      { x: g.x - 3, y: g.y + 7, anchor: "start", dy: "0.8em", text, box: { l: g.x - 3, r: g.x - 3 + w, t: g.y + 7, b: g.y + 7 + h } },
      { x: g.x + 3, y: g.y + 7, anchor: "end", dy: "0.8em", text, box: { l: g.x + 3 - w, r: g.x + 3, t: g.y + 7, b: g.y + 7 + h } },
    ];
    let best = options[0], bestCost = Infinity;
    for (const o of options) {
      const c = cost(o.box);
      if (c < bestCost) { best = o; bestCost = c; }
      if (c === 0) break;
    }
    taken.push(best.box);
    out.push({ x: best.x, y: best.y, text, anchor: best.anchor, dy: best.dy });
  }
  return out;
}

/** Readiness (x, 0–10) against gap (y, 0–100), one small multiple per region with shared axes
 *. Other regions are 3px context dots, the panel's countries 4px ink dots with a paper
 *  ring; the three highest-gap countries of each panel carry their ISO3. No region colours. */
export function ReadinessScatter({
  rows,
  regionLabel,
  xLabel,
  yLabel,
  panelHeight = 170,
  className,
  ariaLabel,
}: {
  rows: ScatterRow[];
  /** @deprecated each panel is `panelHeight` tall; accepted and ignored */
  height?: number;
  regionLabel: (r: string) => string;
  xLabel: string;
  yLabel: string;
  panelHeight?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const t = useTranslations("ui.chart");
  const num = useNumber();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ region: string; i: number } | null>(null);
  const pts = useMemo(
    () => rows.map((r) => ({ ...r, iso3: r.iso3 ?? NAME_TO_ISO3[r.name.toLowerCase()] ?? r.name.slice(0, 3).toUpperCase() })),
    [rows],
  );
  const regions = useMemo(() => {
    const present = Array.from(new Set(pts.map((r) => r.region)));
    return [...REGION_ORDER.filter((r) => present.includes(r)), ...present.filter((r) => !REGION_ORDER.includes(r))];
  }, [pts]);
  const cols = width >= 640 ? 3 : 2;
  const gapX = 20;
  const pw = width > 0 ? Math.floor((width - gapX * (cols - 1)) / cols) : 0;
  const pad = { l: 28, r: 10, t: 10, b: 20 };
  const sx = (v: number) => pad.l + (Math.max(0, Math.min(10, v)) / 10) * (pw - pad.l - pad.r);
  const sy = (v: number) => pad.t + (1 - Math.max(0, Math.min(100, v)) / 100) * (panelHeight - pad.t - pad.b);
  const label: CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.06em",
    fill: "var(--muted-foreground)",
    paintOrder: "stroke",
    stroke: "var(--background)",
    strokeWidth: 2.5,
    strokeLinejoin: "round",
  };
  const tick: CSSProperties = { ...AXIS_TICK, fontSize: 10.5 };

  return (
    <div ref={ref} className={cn("w-full min-w-0", className)} role="group" aria-label={ariaLabel ?? t("scatter")}>
      {pw > 0 && (
        <div className="grid gap-x-5 gap-y-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {regions.map((region) => {
            const mine = pts.filter((p) => p.region === region);
            const others = pts.filter((p) => p.region !== region);
            const top3 = [...mine].sort((a, b) => b.gap - a.gap).slice(0, 3);
            const labels = placeLabels(
              top3.map((p) => ({ x: sx(p.readiness), y: sy(p.gap), text: p.iso3 })),
              mine.map((p) => ({ x: sx(p.readiness), y: sy(p.gap) })),
              { x0: pad.l, y0: 0, x1: pw, y1: sy(0) },
            );
            const h = hover && hover.region === region ? mine[hover.i] : undefined;
            return (
              <figure key={region} className="relative min-w-0">
                <figcaption className="flex items-baseline justify-between gap-2 border-t border-rule pb-1 pt-1.5">
                  <span className="truncate text-[11.5px] font-semibold uppercase tracking-[0.09em]">{regionLabel(region)}</span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">{num.n(mine.length)}</span>
                </figcaption>
                <svg
                  width={pw}
                  height={panelHeight}
                  className="block"
                  role="img"
                  aria-label={`${regionLabel(region)}: ${mine.map((p) => `${p.name} ${num.n(p.readiness)} / ${num.n(p.gap)}`).join("; ")}`}
                >
                  {[0, 50, 100].map((v) => (
                    <g key={`y${v}`}>
                      {v > 0 && <line x1={pad.l} x2={pw - pad.r} y1={sy(v)} y2={sy(v)} stroke="var(--border)" />}
                      <text x={pad.l - 6} y={sy(v)} dy="0.35em" textAnchor="end" style={tick}>{num.n(v)}</text>
                    </g>
                  ))}
                  {[0, 5, 10].map((v) => (
                    <g key={`x${v}`}>
                      {v > 0 && <line x1={sx(v)} x2={sx(v)} y1={pad.t} y2={sy(0)} stroke="var(--border)" />}
                      <text x={sx(v)} y={sy(0) + 14} textAnchor={v === 0 ? "start" : v === 10 ? "end" : "middle"} style={tick}>{num.n(v)}</text>
                    </g>
                  ))}
                  <line x1={pad.l} x2={pw - pad.r} y1={sy(0) + 0.5} y2={sy(0) + 0.5} stroke="var(--rule)" />
                  {others.map((p) => (
                    <circle key={`o${p.iso3}`} cx={sx(p.readiness)} cy={sy(p.gap)} r={3} fill="var(--border)" />
                  ))}
                  {labels.map((l) => (
                    <text key={`l${l.text}`} x={l.x} y={l.y} dy={l.dy} textAnchor={l.anchor} style={label} pointerEvents="none">
                      {l.text}
                    </text>
                  ))}
                  {mine.map((p, i) => (
                    <circle
                      key={`m${p.iso3}`}
                      cx={sx(p.readiness)}
                      cy={sy(p.gap)}
                      r={4}
                      fill="var(--mark-ink)"
                      stroke="var(--background)"
                      strokeWidth={2}
                      style={{ paintOrder: "stroke" }}
                      onMouseEnter={() => setHover({ region, i })}
                      onMouseLeave={() => setHover(null)}
                    />
                  ))}
                  {h && <circle cx={sx(h.readiness)} cy={sy(h.gap)} r={6} fill="none" stroke="var(--foreground)" strokeWidth={1.5} pointerEvents="none" />}
                </svg>
                {h && (
                  <div
                    className="pointer-events-none absolute z-10 w-max max-w-[220px]"
                    style={{
                      ...TOOLTIP_STYLE,
                      top: sy(h.gap) + 44,
                      ...(sx(h.readiness) > pw / 2 ? { right: pw - sx(h.readiness) + 10 } : { left: sx(h.readiness) + 10 }),
                    }}
                  >
                    <p style={TIP_HEAD}>{ISO3_POOL[h.iso3] ? `${h.iso3} · ${ISO3_POOL[h.iso3]}` : h.iso3}</p>
                    <p className="font-semibold">{h.name}</p>
                    <p className="tabular-nums">{xLabel} {num.n(h.readiness)} · {yLabel} {num.n(h.gap)}</p>
                    <p className="tabular-nums text-muted-foreground">{t("nStudies", { n: h.studies })}</p>
                  </div>
                )}
              </figure>
            );
          })}
        </div>
      )}
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
        <span>{t("axes", { x: xLabel, y: yLabel })}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-1.5 rounded-full bg-border" />{t("otherRegions")}</span>
      </p>
    </div>
  );
}

/* ── Sparkline ────────────────────────────────────────────────────────────────────────────── */

/** Tiny studies-per-year bars for tables: ink bars, zero years as 1px hairline ticks, 96×24. */
export function Sparkline({
  values,
  width = 96,
  height = 24,
  className,
  ariaLabel,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const max = Math.max(1, ...values);
  const slot = width / Math.max(1, values.length);
  const bw = Math.max(1, slot - (slot > 3 ? 1 : 0.5));
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {values.map((v, i) => {
        const x = i * slot;
        if (!v) return <rect key={i} x={x} y={height - 1} width={bw} height={1} fill="var(--border)" />;
        const h = Math.max(1.5, (v / max) * (height - 1));
        return <rect key={i} x={x} y={height - h} width={bw} height={h} fill="var(--mark-ink)" />;
      })}
    </svg>
  );
}

/* ── ShareBar, OriginBar ──────────────────────────────────────────────────────────────────── */

export type ShareKind = "full" | "light" | "africa" | "mixed" | "outside" | "ink";
const SHARE_CLASS: Record<ShareKind, string> = {
  full: "bg-full",
  light: "bg-light",
  africa: "bg-africa",
  mixed: "fill-mixed",
  outside: "bg-outside",
  ink: "bg-mark-ink",
};

/** A 22px share bar with 2px paper gaps: the scope bar (full / light) and the origin bar
 *  (africa / mixed / outside). Segments grow with their value. */
export function ShareBar({
  parts,
  ariaLabel,
  className,
}: {
  parts: { key: string; value: number; kind: ShareKind; label?: string }[];
  ariaLabel?: string;
  className?: string;
}) {
  const num = useNumber();
  const label = ariaLabel ?? parts.map((p) => `${p.label ?? p.key} ${num.n(p.value)}`).join(", ");
  return (
    <div role="img" aria-label={label} className={cn("flex h-[22px] w-full gap-[2px]", className)}>
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <i key={p.key} className={cn("block h-full min-w-[2px]", SHARE_CLASS[p.kind])} style={{ flex: `${p.value} 1 0%` }} />
        ))}
    </div>
  );
}

/** Who leads the modelling: African-led (malachite), mixed teams (malachite/violet
 *  stripes), non-African (violet), then the legend list with counts and shares. */
export function OriginBar({
  origin,
  labels,
  legend = true,
  className,
  children,
}: {
  origin: { african_led: number; mixed: number; non_african: number; assessed: number };
  labels: { african_led: string; mixed: string; non_african: string };
  legend?: boolean;
  className?: string;
  /** extra content under the legend list (a callout) */
  children?: ReactNode;
}) {
  const num = useNumber();
  const parts = [
    { key: "african_led", value: origin.african_led, kind: "africa" },
    { key: "mixed", value: origin.mixed, kind: "mixed" },
    { key: "non_african", value: origin.non_african, kind: "outside" },
  ] as const;
  const total = origin.assessed || origin.african_led + origin.mixed + origin.non_african || 1;
  return (
    <div className={cn("min-w-0", className)}>
      <ShareBar parts={parts.map((p) => ({ ...p, label: labels[p.key] }))} />
      {legend && (
        <ul className="mt-3 border-t border-border">
          {parts.map((p) => (
            <li key={p.key} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border py-2 text-sm">
              <Key kind={p.kind} size="lg" />
              <span>{labels[p.key]}</span>
              <span className="text-[13px] tabular-nums text-muted-foreground">
                <b className="font-semibold text-foreground">{num.n(p.value)}</b> · {num.pct((p.value / total) * 100)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
