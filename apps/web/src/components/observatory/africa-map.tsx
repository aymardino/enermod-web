"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { scaleLinear, scaleSequential } from "d3-scale";
import { africaFeatures, worldFeatures, type CountryFeature } from "@/lib/geo";
import { cn } from "@/lib/utils";

export type MapDatum = { iso3: string; value: number | null; label: string; hint?: string; href?: string };

type Props = {
  data: MapDatum[];
  /** colour ramp stops from low to high */
  colors?: string[];
  domain?: [number, number];
  className?: string;
  legend?: { low: string; high: string };
  emptyLabel?: string;
  onSelect?: (iso3: string) => void;
  formatValue?: (v: number) => string;
};

const WIDTH = 640;
const HEIGHT = 640;

function useProjection(features: CountryFeature[], world = false) {
  return useMemo(() => {
    const projection = geoMercator();
    const fc = { type: "FeatureCollection" as const, features };
    projection.fitExtent([[8, 8], [WIDTH - 8, HEIGHT - 8]], fc);
    if (world) projection.fitExtent([[4, 40], [WIDTH - 4, HEIGHT * 0.78]], fc);
    return geoPath(projection);
  }, [features, world]);
}

/** Choropleth of the 54 African countries. Pure SVG, no map tiles, works offline. */
export function AfricaMap({ data, colors = ["#e5f0e8", "#2f7d4f", "#0c2518"], domain, className, legend, emptyLabel = "not assessed", onSelect, formatValue }: Props) {
  const features = useMemo(() => africaFeatures(), []);
  const path = useProjection(features);
  const [hover, setHover] = useState<MapDatum | null>(null);
  const byIso = useMemo(() => new Map(data.map((d) => [d.iso3, d])), [data]);
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const [lo, hi] = domain ?? [Math.min(...values, 0), Math.max(...values, 1)];
  const color = useMemo(() => {
    const stops = colors.length - 1;
    const sc = scaleLinear<string>().domain(colors.map((_, i) => lo + ((hi - lo) * i) / stops)).range(colors).clamp(true);
    return (v: number) => sc(v);
  }, [colors, lo, hi]);
  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Map of Africa">
        {features.map((f) => {
          const d = byIso.get(f.properties.iso3);
          const fill = d && d.value !== null ? color(d.value) : "var(--muted)";
          return (
            <path key={f.properties.iso3} d={path(f) ?? ""} fill={fill} stroke="var(--background)" strokeWidth={0.8}
              className={cn("transition-opacity", d?.href || onSelect ? "cursor-pointer hover:opacity-80" : "")}
              onMouseEnter={() => setHover(d ?? { iso3: f.properties.iso3, value: null, label: f.properties.name })}
              onMouseLeave={() => setHover(null)}
              onClick={() => { if (onSelect) onSelect(f.properties.iso3); else if (d?.href) window.location.assign(d.href); }} />
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-pop">
          <b>{hover.label}</b>
          <div className="text-muted-foreground">{hover.value === null ? emptyLabel : (formatValue ? formatValue(hover.value) : hover.value)}{hover.hint ? ` · ${hover.hint}` : ""}</div>
        </div>
      )}
      {legend && (
        <div className="absolute bottom-2 left-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{legend.low}</span>
          <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(to right, ${colors.join(",")})` }} />
          <span>{legend.high}</span>
        </div>
      )}
    </div>
  );
}

/** World map of author countries: two sequential ramps, one for Africa and one for the rest. */
export function WorldOriginMap({ rows, className, labels }: { rows: { iso3: string; n: number; name: string; group: "africa" | "outside" }[]; className?: string; labels: { africa: string; outside: string; studies: string } }) {
  const features = useMemo(() => worldFeatures(), []);
  const path = useProjection(features, true);
  const [hover, setHover] = useState<{ name: string; n: number; group: string } | null>(null);
  const byIso = useMemo(() => new Map(rows.map((r) => [r.iso3, r])), [rows]);
  const maxA = Math.max(1, ...rows.filter((r) => r.group === "africa").map((r) => r.n));
  const maxO = Math.max(1, ...rows.filter((r) => r.group === "outside").map((r) => r.n));
  const africa = useMemo(() => scaleSequential<string>().domain([0, Math.log1p(maxA)]).interpolator((t) => `color-mix(in srgb, #cfe6d6 ${Math.round((1 - t) * 100)}%, #12402a)`), [maxA]);
  const outside = useMemo(() => scaleSequential<string>().domain([0, Math.log1p(maxO)]).interpolator((t) => `color-mix(in srgb, #f6d9bc ${Math.round((1 - t) * 100)}%, #7e430e)`), [maxO]);
  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT * 0.78}`} className="h-auto w-full" role="img" aria-label="World map of author countries">
        {features.map((f) => {
          const r = byIso.get(f.properties.iso3);
          const fill = r ? (r.group === "africa" ? africa(Math.log1p(r.n)) : outside(Math.log1p(r.n))) : "var(--muted)";
          return <path key={f.properties.iso3 || f.properties.name} d={path(f) ?? ""} fill={fill} stroke="var(--background)" strokeWidth={0.5}
            onMouseEnter={() => r && setHover({ name: r.name, n: r.n, group: r.group })} onMouseLeave={() => setHover(null)} />;
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-pop">
          <b>{hover.name}</b><div className="text-muted-foreground">{hover.n} {labels.studies} · {hover.group === "africa" ? labels.africa : labels.outside}</div>
        </div>
      )}
      <div className="absolute bottom-1 left-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-16 rounded-full" style={{ background: "linear-gradient(to right,#cfe6d6,#12402a)" }} />{labels.africa}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-16 rounded-full" style={{ background: "linear-gradient(to right,#f6d9bc,#7e430e)" }} />{labels.outside}</span>
      </div>
    </div>
  );
}
