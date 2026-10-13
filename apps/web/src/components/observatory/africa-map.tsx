"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import geoJson from "@/data/geo-africa.json";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Caption } from "@/components/observatory/kpi";
import { AFRICA_COUNTRIES } from "@/components/observatory/study-card";
import {
  BREAKS,
  METRIC_RAMP,
  RAMPS,
  classCounts,
  classLabels,
  classOf,
  inferMetric,
  type Breaks,
  type MapMetric,
  type RampKey,
} from "@/components/observatory/map-classes";
import { LegendKey, MapLegend, StepLegend } from "@/components/observatory/map-legend";
import { placeCallout, type Box, type CalloutPlacement, type LandRaster } from "@/components/observatory/map-callout";
import { InkTip, useMapTip, useTextScale } from "@/components/observatory/map-tip";

export { BREAKS, METRIC_RAMP, RAMPS, classCounts, classLabels, classOf, type Breaks, type MapMetric, type RampKey };
export { LegendKey, MapLegend, StepLegend };

/* ── precomputed plate (scripts/build-geo.mjs → src/data/geo-africa.json) ─────────────────── */
type GeoAfrica = {
  viewBox: [number, number];
  frame: [number, number, number, number];
  bandWidth: number;
  countries: { iso3: string; d: string; c: [number, number] }[];
  islands: { iso3: string; x: number; y: number; pos: "n" | "s" | "e" | "w" }[];
  context: string;
  graticule: string;
  parallels: { cancer: string; equator: string; capricorn: string };
  parallelLabels: Record<"cancer" | "equator" | "capricorn", { x: number; y: number; a: "start" | "end" }>;
  coast: string;
  band: string;
  degrees: { s: "t" | "b" | "l" | "r"; v: number; p: number }[];
  land: LandRaster;
  mark: { d: string; eq: number; cancer: number; capricorn: number };
};
const G = geoJson as unknown as GeoAfrica;
const [VW, VH] = G.viewBox;
const [X0, Y0, X1, Y1] = G.frame;
const ISLAND_R = 4.2;

/** ISO3 → ISO2, power pool and names, from the shared country list. */
const BY_ISO3: Record<string, { iso2: string; pool: string; en: string; fr: string }> = Object.fromEntries(
  Object.entries(AFRICA_COUNTRIES).map(([iso2, c]) => [c.iso3, { iso2, pool: c.pool, en: c.en, fr: c.fr }]),
);

/** Where a country or island sits on the plate (viewBox units): centroid or dot. */
function anchorOf(iso3: string): [number, number] | undefined {
  const c = G.countries.find((x) => x.iso3 === iso3);
  if (c) return c.c;
  const i = G.islands.find((x) => x.iso3 === iso3);
  return i ? [i.x, i.y] : undefined;
}

/** Mark geometry, for consumers that draw the plate mark from data. */
export const MAP_MARK = G.mark;

/* ── text at fixed CSS pixels: font-size = N px × --k, with a paper halo ─────────────── */
const HALO: CSSProperties = {
  paintOrder: "stroke",
  stroke: "var(--background)",
  strokeWidth: "calc(3px * var(--k))",
  strokeLinejoin: "round",
};
const T_ISO: CSSProperties = {
  ...HALO,
  fontFamily: "var(--font-sans)",
  fontSize: "calc(10.5px * var(--k))",
  fontWeight: 600,
  letterSpacing: "0.06em",
  fill: "var(--muted-foreground)",
};
const T_CALLOUT: CSSProperties = { ...HALO, fontFamily: "var(--font-sans)", fontSize: "calc(12.5px * var(--k))", fontWeight: 600, fill: "var(--foreground)" };
const T_CALLOUT_NOTE: CSSProperties = {
  ...HALO,
  fontFamily: "var(--font-sans)",
  fontSize: "calc(13px * var(--k))",
  fill: "var(--muted-foreground)",
};
const T_DEGREE: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "calc(10.5px * var(--k))",
  fontWeight: 500,
  fill: "var(--muted-foreground)",
  fontVariantNumeric: "tabular-nums",
};

/* ── AfricaMap ────────────────────────────────────────────────────────────────────────────── */

export type MapDatum = {
  iso3: string;
  /** null = no value (not ranked, not assessed): hatched */
  value: number | null;
  /** country name as shown in the tooltip */
  label: string;
  /** second value line in the tooltip ("45 tools") */
  hint?: string;
  /** country page; makes the country a focusable link */
  href?: string;
  /** first tooltip line; defaults to "NGA · WAPP" */
  code?: string;
};

export type AfricaMapProps = {
  data: MapDatum[];
  /** Fixed five-class scheme of (breaks and ramp). Recommended; inferred from `domain` when absent. */
  metric?: MapMetric;
  /** Override the four thresholds of `metric`. */
  breaks?: Breaks;
  /** Override the ramp of `metric`. */
  ramp?: RampKey;
  /** @deprecated colours come from `metric`; kept so legacy call sites compile (ignored). */
  colors?: string[];
  /** Legacy: [0, 100] means gap, [0, 10] readiness; otherwise counts. Prefer `metric`. */
  domain?: [number, number];
  className?: string;
  /** Stepped legend under the plate (default shown). The legacy { low, high } labels are not used. */
  legend?: boolean | { low: string; high: string };
  /** Legend title, e.g. "Studies per country"; the per-class note is appended. */
  legendTitle?: ReactNode;
  /** Label for null values (tooltip and hatch key), e.g. "Not ranked". Default "Not in the inventory". */
  emptyLabel?: string;
  /** Label for countries absent from `data` (drawn as empty land), default "No studies". */
  zeroLabel?: string;
  /** Called on click instead of following `href` (or for countries without `href`). */
  onSelect?: (iso3: string) => void;
  formatValue?: (v: number) => string;
  /** Unit appended to values in the tooltip and the callout ("studies"); ignored with formatValue. */
  unit?: string;
  /** Leader line to the highest country (or `calloutIso3`): true = "256 studies, the most";
   *  a string or a function of the datum = the italic second line. */
  callout?: boolean | string | ((top: MapDatum) => string);
  calloutIso3?: string;
  /** Degree labels around the frame (hidden below 768px regardless). Default true. */
  degrees?: boolean;
  /** Caption under the legend: <figure> + "Fig. n" lead. */
  fig?: number | string;
  caption?: ReactNode;
  ariaLabel?: string;
};

/** Equal-area atlas plate of the 54 countries: Lambert azimuthal equal-area, graduated
 *  degree frame, 10° graticule, the three parallels, coastline, hatched no-data, island states as
 *  dots, five fixed classes and a stepped legend. Geometry is precomputed; only fills and the text
 *  factor --k are computed here. */
export function AfricaMap({
  data,
  metric: metricProp,
  breaks: breaksProp,
  ramp: rampProp,
  domain,
  className,
  legend = true,
  legendTitle,
  emptyLabel,
  zeroLabel,
  onSelect,
  formatValue,
  unit,
  callout,
  calloutIso3,
  degrees = false,
  fig,
  caption,
  ariaLabel,
}: AfricaMapProps) {
  const t = useTranslations("ui.map");
  const locale = useLocale();
  const fr = locale.startsWith("fr");
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const hatchId = `em-hatch-${uid}`, clipId = `em-clip-${uid}`;

  const byIso = useMemo(() => new Map(data.map((d) => [d.iso3, d])), [data]);
  const values = useMemo(() => data.map((d) => d.value).filter((v): v is number => v !== null && Number.isFinite(v)), [data]);
  const metric = metricProp ?? inferMetric(domain, values);
  const breaks = (breaksProp ?? BREAKS[metric]) as Breaks;
  const ramp = RAMPS[rampProp ?? METRIC_RAMP[metric]];
  const nf = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const fmt = useCallback((v: number) => (formatValue ? formatValue(v) : `${nf.format(v)}${unit ? ` ${unit}` : ""}`), [formatValue, nf, unit]);
  const emptyText = emptyLabel || t("noData");
  const zeroText = zeroLabel || t("none");

  const nameOf = (iso3: string) => {
    if (iso3 === "ESH") return t("westernSahara");
    const c = BY_ISO3[iso3];
    return byIso.get(iso3)?.label || (c ? (fr ? c.fr : c.en) : iso3);
  };
  const codeOf = (iso3: string) => {
    const d = byIso.get(iso3);
    if (d?.code) return d.code;
    const pool = BY_ISO3[iso3]?.pool;
    return pool ? `${iso3} · ${pool}` : iso3;
  };
  const fillOf = (iso3: string) => {
    if (iso3 === "ESH") return `url(#${hatchId})`;
    const d = byIso.get(iso3);
    if (!d) return "var(--sand-200)";
    const c = classOf(d.value, breaks);
    return c < 0 ? `url(#${hatchId})` : ramp[c];
  };
  const linesOf = (iso3: string) => {
    if (iso3 === "ESH") return [t("noData")];
    const d = byIso.get(iso3);
    if (!d) return [zeroText];
    return [d.value === null ? emptyText : fmt(d.value), ...(d.hint ? [d.hint] : [])];
  };
  const ariaOf = (iso3: string) => `${nameOf(iso3)} · ${codeOf(iso3)}: ${linesOf(iso3).join(", ")}`;

  /* legend content */
  const shownCodes = useMemo(() => [...G.countries.map((c) => c.iso3), ...G.islands.map((i) => i.iso3)].filter((c) => c !== "ESH"), []);
  const counts = classCounts(data.filter((d) => shownCodes.includes(d.iso3)).map((d) => d.value), breaks);
  const labels = classLabels(breaks, { locale, metric: breaksProp ? undefined : metric, min: values.length ? Math.min(...values) : undefined });
  const hasNull = data.some((d) => d.value === null && d.iso3 !== "ESH");
  const hasZero = shownCodes.some((c) => !byIso.has(c));

  /* callout to the highest country */
  const top = useMemo(() => {
    if (!callout) return null;
    if (calloutIso3) return byIso.get(calloutIso3) ?? null;
    let best: MapDatum | null = null;
    for (const d of data) if (d.value !== null && anchorOf(d.iso3) && (!best || d.value > (best.value ?? -Infinity))) best = d;
    return best;
  }, [callout, calloutIso3, byIso, data]);
  const calloutNote = !top
    ? ""
    : typeof callout === "function"
      ? callout(top)
      : typeof callout === "string"
        ? callout
        : t("most", { value: top.value === null ? emptyText : fmt(top.value) });
  // a narrow plate thins its degree labels: above k 1.2 every 20°, above 1.3 the latitude labels
  // no longer fit the side margins and only the top and bottom ones stay
  const [density, setDensity] = useState<0 | 1 | 2>(0);
  // without degree labels the plate is cropped to its frame
  const vb = degrees ? [0, 0, VW, VH] : [X0 - 1, Y0 - 1, X1 - X0 + 2, Y1 - Y0 + 2];
  const placeRef = useRef<() => void>(() => {});
  const svgRef = useTextScale(vb[2], (k) => {
    setDensity(k > 1.3 ? 2 : k > 1.2 ? 1 : 0);
    placeRef.current();
  });

  // callout: measure its two lines and the obstacles (island and parallel labels), then search
  const calloutRef = useRef<SVGGElement>(null);
  const [placed, setPlaced] = useState<CalloutPlacement | null>(null);
  const topIso3 = top?.iso3;
  const place = useCallback(() => {
    const svg = svgRef.current, g = calloutRef.current;
    const at = topIso3 ? anchorOf(topIso3) : undefined;
    if (!svg || !g || !at) return;
    let width = 0;
    g.querySelectorAll("text").forEach((el) => { width = Math.max(width, el.getComputedTextLength()); });
    const k = parseFloat(svg.style.getPropertyValue("--k")) || 1;
    const obstacles: Box[] = [];
    svg.querySelectorAll<SVGGraphicsElement>("[data-obstacle]").forEach((el) => {
      const b = el.getBBox();
      obstacles.push([b.x - 3, b.y - 3, b.x + b.width + 3, b.y + b.height + 3]);
    });
    const soft: Box[] = [];
    svg.querySelectorAll<SVGGraphicsElement>("[data-soft-obstacle]").forEach((el) => {
      const b = el.getBBox();
      soft.push([b.x, b.y - 2, b.x + b.width, b.y + b.height + 2]);
    });
    const p = placeCallout({ at, width, k, obstacles, soft, frame: G.frame, land: G.land });
    setPlaced((prev) => (prev && p && prev.x === p.x && prev.y === p.y && prev.ex === p.ex && prev.a === p.a ? prev : p));
  }, [svgRef, topIso3]);
  useEffect(() => {
    placeRef.current = place;
  });
  useLayoutEffect(() => {
    place();
  }, [place, calloutNote, locale]);
  const { wrapRef, tipRef, active, handlers: h } = useMapTip((key) => {
    const at = anchorOf(key);
    return at ? [at[0] - vb[0], at[1] - vb[1]] : undefined;
  }, vb[2]);
  const interactive = Boolean(onSelect) || data.some((d) => d.href);

  const wrap = (iso3: string, shape: ReactNode) => {
    const d = byIso.get(iso3);
    if (d?.href) {
      return (
        <Link
          key={iso3}
          data-key={iso3}
          href={d.href}
          prefetch={false}
          aria-label={ariaOf(iso3)}
          className="cursor-pointer outline-none"
          onClick={onSelect ? (e: MouseEvent) => { e.preventDefault(); onSelect(iso3); } : undefined}
          {...h}
        >
          {shape}
        </Link>
      );
    }
    if (onSelect && d) {
      return (
        <g
          key={iso3}
          data-key={iso3}
          role="link"
          tabIndex={0}
          aria-label={ariaOf(iso3)}
          className="cursor-pointer outline-none"
          onClick={() => onSelect(iso3)}
          onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter") onSelect(iso3); }}
          {...h}
        >
          {shape}
        </g>
      );
    }
    return (
      <g key={iso3} data-key={iso3} aria-hidden onMouseEnter={h.onMouseEnter} onMouseMove={h.onMouseMove} onMouseLeave={h.onMouseLeave}>
        {shape}
      </g>
    );
  };

  const activeCountry = active ? G.countries.find((c) => c.iso3 === active.key) : undefined;
  const activeIsland = active ? G.islands.find((c) => c.iso3 === active.key) : undefined;
  const outline = active?.focus ? "var(--ring)" : "var(--foreground)";
  const deg = (v: number, side: "t" | "b" | "l" | "r") => {
    if (v === 0) return "0°";
    const lon = side === "t" || side === "b";
    const hemi = lon ? (v > 0 ? "E" : fr ? "O" : "W") : v > 0 ? "N" : "S";
    return fr ? `${Math.abs(v)}° ${hemi}` : `${Math.abs(v)}°${hemi}`;
  };

  const coAt = top ? anchorOf(top.iso3) : undefined;

  const Root = caption !== undefined || fig !== undefined ? "figure" : "div";
  return (
    <Root className={cn("min-w-0", className)}>
      <div ref={wrapRef} className="relative">
        <svg
          ref={svgRef}
          viewBox={vb.join(" ")}
          className="block h-auto w-full select-none"
          style={{ ["--k" as string]: 1 }}
          role={interactive ? "group" : "img"}
          aria-label={ariaLabel ?? (typeof legendTitle === "string" ? legendTitle : t("aria"))}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} />
            </clipPath>
            <pattern id={hatchId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--background)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--nodata)" strokeWidth="1.2" />
            </pattern>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="var(--background)" />
            <path d={G.context} fill="var(--sand-200)" stroke="var(--background)" strokeWidth={0.6} aria-hidden />
            <g>
              {G.countries.map((c) =>
                wrap(
                  c.iso3,
                  <path d={c.d} fill={fillOf(c.iso3)} stroke="var(--background)" strokeWidth={0.7} strokeLinejoin="round" />,
                ),
              )}
            </g>
            <path d={G.coast} fill="none" stroke="var(--coast)" strokeWidth={0.8} strokeLinejoin="round" pointerEvents="none" aria-hidden />
            <g>
              {G.islands.map((i) =>
                wrap(
                  i.iso3,
                  <>
                    <circle cx={i.x} cy={i.y} r={11} fill="transparent" />
                    <circle cx={i.x} cy={i.y} r={ISLAND_R} fill={fillOf(i.iso3)} stroke="var(--coast)" strokeWidth={0.9} data-obstacle />
                  </>,
                ),
              )}
            </g>
            <g aria-hidden pointerEvents="none">
              {G.islands.map((i) => (
                <text
                  key={i.iso3}
                  x={i.pos === "e" ? i.x + 7 : i.pos === "w" ? i.x - 7 : i.x}
                  y={i.pos === "n" ? i.y - 6.5 : i.pos === "s" ? i.y + 6.5 : i.y}
                  dy={i.pos === "s" ? "0.8em" : i.pos === "n" ? undefined : "0.35em"}
                  textAnchor={i.pos === "e" ? "start" : i.pos === "w" ? "end" : "middle"}
                  style={T_ISO}
                  data-obstacle
                >
                  {i.iso3}
                </text>
              ))}
            </g>
            {top && coAt && (
              <g ref={calloutRef} aria-hidden pointerEvents="none" visibility={placed ? undefined : "hidden"} data-callout={coAt.join(",")}>
                {placed && (
                  <>
                    <circle cx={coAt[0]} cy={coAt[1]} r={2.8} fill="var(--foreground)" />
                    <path
                      d={`M${coAt[0]} ${coAt[1]}L${placed.ex} ${placed.y}L${placed.x} ${placed.y}`}
                      fill="none"
                      stroke="var(--foreground)"
                      strokeWidth={0.8}
                    />
                  </>
                )}
                <text x={placed?.x ?? 0} y={placed?.y ?? 0} dy="-0.45em" textAnchor={placed?.a ?? "start"} style={T_CALLOUT}>
                  {nameOf(top.iso3)} · {top.iso3}
                </text>
                <text x={placed?.x ?? 0} y={placed?.y ?? 0} dy="1.25em" textAnchor={placed?.a ?? "start"} style={T_CALLOUT_NOTE}>
                  {calloutNote}
                </text>
              </g>
            )}
            {/* hover: 2px ink outline; keyboard focus: 2px lapis ring over a paper halo, so it reads on lapis fills */}
            {activeCountry && (
              <g pointerEvents="none" fill="none" strokeLinejoin="round">
                {active?.focus && <path d={activeCountry.d} stroke="var(--background)" strokeWidth={5} vectorEffect="non-scaling-stroke" />}
                <path d={activeCountry.d} stroke={outline} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              </g>
            )}
            {activeIsland && (
              <g pointerEvents="none" fill="none">
                {active?.focus && <circle cx={activeIsland.x} cy={activeIsland.y} r={ISLAND_R + 1} stroke="var(--background)" strokeWidth={5} vectorEffect="non-scaling-stroke" />}
                <circle cx={activeIsland.x} cy={activeIsland.y} r={ISLAND_R + 1} stroke={outline} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              </g>
            )}
          </g>
          {degrees && (
            <g aria-hidden className="max-md:hidden">
              {G.degrees.filter((d) => (density === 0 || d.v % 20 === 0) && (density < 2 || d.s === "t" || d.s === "b")).map((d) => (
                <text
                  key={`${d.s}${d.v}`}
                  x={d.s === "t" || d.s === "b" ? d.p : d.s === "l" ? X0 - 6 : X1 + 6}
                  y={d.s === "t" ? Y0 - 7 : d.s === "b" ? Y1 + 7 : d.p}
                  dy={d.s === "b" ? "0.85em" : d.s === "t" ? undefined : "0.35em"}
                  textAnchor={d.s === "l" ? "end" : d.s === "r" ? "start" : "middle"}
                  style={T_DEGREE}
                >
                  {deg(d.v, d.s)}
                </text>
              ))}
            </g>
          )}
        </svg>
        {active && <InkTip tipRef={tipRef} code={codeOf(active.key)} name={nameOf(active.key)} lines={linesOf(active.key)} />}
      </div>
      {legend !== false && (
        <MapLegend>
          <StepLegend title={legendTitle} colors={ramp} labels={labels} counts={counts} />
          {/* Western Sahara is always hatched, so the key always shows */}
          <LegendKey kind="nodata" label={hasNull ? emptyText : t("noData")} />
          {hasZero && <LegendKey kind="zero" label={zeroText} />}
          <LegendKey kind="island" label={t("islands")} color={ramp[0]} />
        </MapLegend>
      )}
      {(caption !== undefined || fig !== undefined) && <Caption fig={fig}>{caption}</Caption>}
    </Root>
  );
}

/* ── WorldOriginMap lives in world-map.tsx (re-exported here for existing imports) ──────────── */
export { WorldOriginMap, type OriginRow } from "@/components/observatory/world-map";
