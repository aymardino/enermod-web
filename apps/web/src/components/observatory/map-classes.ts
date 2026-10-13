/** Five-class threshold maps (docs/design-system.md).
 *
 *  Class breaks are fixed and documented, never recomputed per render, so maps compare over time.
 *  `BREAKS[m]` is the `d3.scaleThreshold().domain` of metric m: four thresholds, five classes.
 *  Plain module (no "use client"), so server components may import the constants too. */
import { scaleThreshold } from "d3-scale";

export const BREAKS = {
  /** studies per country (all scopes): 10–29 · 30–39 · 40–49 · 50–99 · 100+ */
  studies: [30, 40, 50, 100],
  /** whole energy-system studies: <20 · 20–24 · 25–29 · 30–39 · 40+ */
  full: [20, 25, 30, 40],
  /** focused studies: 0–4 · 5–9 · 10–19 · 20–49 · 50+ */
  light: [5, 10, 20, 50],
  /** distinct tools per country: 8–17 · 18–21 · 22–25 · 26–31 · 32+ */
  tools: [18, 22, 26, 32],
  /** gap score 0–100 (higher = more under-served): <35 · 35–44 · 45–54 · 55–64 · 65+ */
  gap: [35, 45, 55, 65],
  /** readiness 0–10: <2 · 2–3.9 · 4–5.9 · 6–7.9 · 8+ (not ranked = hatched) */
  readiness: [2, 4, 6, 8],
  /** authors' countries (world map, Africa and outside): 1 · 2–4 · 5–9 · 10–24 · 25+ */
  authorship: [2, 5, 10, 25],
  /** studies per country for a single tool (tool pages; not in, same steps as authorship) */
  toolStudies: [2, 5, 10, 25],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type MapMetric = keyof typeof BREAKS;
export type Breaks = readonly [number, number, number, number];

/** Sequential ramps, light to dark. Each hue keeps one meaning. */
export const RAMPS = {
  count: ["var(--seq-count-1)", "var(--seq-count-2)", "var(--seq-count-3)", "var(--seq-count-4)", "var(--seq-count-5)"],
  gap: ["var(--seq-gap-1)", "var(--seq-gap-2)", "var(--seq-gap-3)", "var(--seq-gap-4)", "var(--seq-gap-5)"],
  ready: ["var(--seq-ready-1)", "var(--seq-ready-2)", "var(--seq-ready-3)", "var(--seq-ready-4)", "var(--seq-ready-5)"],
  africa: ["var(--seq-africa-1)", "var(--seq-africa-2)", "var(--seq-africa-3)", "var(--seq-africa-4)", "var(--seq-africa-5)"],
  outside: ["var(--seq-outside-1)", "var(--seq-outside-2)", "var(--seq-outside-3)", "var(--seq-outside-4)", "var(--seq-outside-5)"],
} as const;
export type RampKey = keyof typeof RAMPS;

/** Which ramp a metric is drawn with: lapis = studies, oxide = gap, malachite = readiness. */
export const METRIC_RAMP: Record<MapMetric, RampKey> = {
  studies: "count", full: "count", light: "count", tools: "count", toolStudies: "count",
  gap: "gap", readiness: "ready", authorship: "africa",
};

/** How the first class is written in the legend, as in the table: from the data minimum
 *  ("10–29") or as an open bound ("<20"). */
const FIRST_FROM_MIN: Record<MapMetric, boolean> = {
  studies: true, full: false, light: true, tools: true, toolStudies: true, gap: false, readiness: false, authorship: true,
};
/** Metrics with one decimal (readiness 0–10); the others are integers. */
const DECIMALS: Record<MapMetric, number> = {
  studies: 0, full: 0, light: 0, tools: 0, toolStudies: 0, gap: 0, readiness: 1, authorship: 0,
};

/** Class index 0–4 of a value (d3 scaleThreshold), or -1 when there is no value. */
export function classOf(value: number | null | undefined, breaks: Breaks): number {
  if (value === null || value === undefined || Number.isNaN(value)) return -1;
  return scaleThreshold<number, number>().domain([...breaks]).range([0, 1, 2, 3, 4])(value);
}

/** Number of values in each of the five classes (nulls are not counted). */
export function classCounts(values: (number | null | undefined)[], breaks: Breaks): [number, number, number, number, number] {
  const n: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const v of values) {
    const c = classOf(v, breaks);
    if (c >= 0) n[c] += 1;
  }
  return n;
}

/** Legend bounds for the five classes, formatted for the locale ("10–29", "2–3,9", "100+").
 *  `min` is the smallest value on the map; it opens the first class when the metric does. */
export function classLabels(
  breaks: Breaks,
  { locale, metric, decimals, firstFromMin, min }: { locale: string; metric?: MapMetric; decimals?: number; firstFromMin?: boolean; min?: number },
): [string, string, string, string, string] {
  const dp = decimals ?? (metric ? DECIMALS[metric] : 0);
  const fromMin = firstFromMin ?? (metric ? FIRST_FROM_MIN[metric] : true);
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: dp });
  const step = dp > 0 ? 10 ** -dp : 1;
  const below = (b: number) => nf.format(Math.round((b - step) * 10 ** dp) / 10 ** dp);
  const range = (a: number, b: number) => (a === b - step ? nf.format(a) : `${nf.format(a)}–${below(b)}`);
  const first =
    fromMin && min !== undefined && Number.isFinite(min) && min < breaks[0]
      ? range(Math.floor(min * 10 ** dp) / 10 ** dp, breaks[0])
      : `<${nf.format(breaks[0])}`;
  return [first, range(breaks[0], breaks[1]), range(breaks[1], breaks[2]), range(breaks[2], breaks[3]), `${nf.format(breaks[3])}+`];
}

/** Legacy maps passed a colour list and a domain; infer the class scheme they meant. New code passes
 *  `metric` explicitly. */
export function inferMetric(domain: [number, number] | undefined, values: number[]): MapMetric {
  if (domain && domain[0] === 0 && domain[1] === 100) return "gap";
  if (domain && domain[0] === 0 && domain[1] === 10) return "readiness";
  const max = values.length ? Math.max(...values) : 0;
  return max >= 100 ? "studies" : "toolStudies";
}
