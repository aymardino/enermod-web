"use client";

import { useId, useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { geoEqualEarth, geoGraticule, geoPath } from "d3-geo";
import { worldFeatures } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { Caption } from "@/components/observatory/kpi";
import { BREAKS, RAMPS, classCounts, classLabels, classOf, type Breaks } from "@/components/observatory/map-classes";
import { LegendKey, MapLegend, StepLegend } from "@/components/observatory/map-legend";
import { InkTip, useMapTip, useTextScale } from "@/components/observatory/map-tip";

export type OriginRow = { iso3: string; n: number; name: string; group: "africa" | "outside" };

const WW = 640;

/** World map of the authors' countries on Equal Earth: malachite ramp for African
 *  institutions, violet for institutions outside Africa, fixed authorship breaks, one stepped
 *  legend per ramp. */
export function WorldOriginMap({
  rows,
  className,
  labels,
  breaks = BREAKS.authorship,
  legend = true,
  fig,
  caption,
  ariaLabel,
}: {
  rows: OriginRow[];
  className?: string;
  /** africa / outside name the two groups (legend titles and tooltip); studies is the value unit.
   *  legendAfrica / legendOutside override the legend titles. */
  labels: { africa: string; outside: string; studies: string; legendAfrica?: string; legendOutside?: string; none?: string };
  breaks?: Breaks;
  legend?: boolean;
  fig?: number | string;
  caption?: ReactNode;
  ariaLabel?: string;
}) {
  const t = useTranslations("ui.map");
  const locale = useLocale();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `em-wclip-${uid}`;
  const features = useMemo(() => worldFeatures(), []);
  const { path, height, outline, graticule } = useMemo(() => {
    // crop the empty Antarctic latitudes: fit the outline of 58°S…84°N
    const grat = geoGraticule().extent([[-180, -58], [180, 84]]).step([30, 30]);
    const outlineGeo = grat.outline();
    const projection = geoEqualEarth().fitWidth(WW, outlineGeo);
    const p = geoPath(projection);
    const [[, y0], [, y1]] = p.bounds(outlineGeo);
    projection.translate([projection.translate()[0], projection.translate()[1] - y0 + 1]);
    return { path: p, height: Math.ceil(y1 - y0 + 2), outline: p(outlineGeo) ?? "", graticule: p(grat()) ?? "" };
  }, []);
  const byIso = useMemo(() => new Map(rows.map((r) => [r.iso3, r])), [rows]);
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fillOf = (r: OriginRow | undefined) => (r ? RAMPS[r.group][Math.max(0, classOf(r.n, breaks))] : "var(--sand-200)");
  const countsA = classCounts(rows.filter((r) => r.group === "africa").map((r) => r.n), breaks);
  const countsO = classCounts(rows.filter((r) => r.group === "outside").map((r) => r.n), breaks);
  const minOf = (g: "africa" | "outside") => {
    const v = rows.filter((r) => r.group === g).map((r) => r.n);
    return v.length ? Math.min(...v) : undefined;
  };
  const { wrapRef, tipRef, active: activeTip, handlers: h } = useMapTip();
  const svgRef = useTextScale(WW);
  const active = activeTip ? features.find((f) => (f.properties.iso3 || f.properties.name) === activeTip.key) : undefined;
  const activeRow = active ? byIso.get(active.properties.iso3) : undefined;

  const Root = caption !== undefined || fig !== undefined ? "figure" : "div";
  return (
    <Root className={cn("min-w-0", className)}>
      <div ref={wrapRef} className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WW} ${height}`}
          className="block h-auto w-full select-none"
          role="img"
          aria-label={ariaLabel ?? t("world")}
        >
          <defs>
            <clipPath id={clipId}>
              <path d={outline} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <path d={outline} fill="var(--background)" />
            <path d={graticule} fill="none" stroke="var(--border)" strokeWidth={0.5} />
            {features.map((f) => {
              const key = f.properties.iso3 || f.properties.name;
              const r = byIso.get(f.properties.iso3);
              return (
                <path
                  key={key}
                  d={path(f) ?? ""}
                  fill={fillOf(r)}
                  stroke="var(--background)"
                  strokeWidth={0.5}
                  strokeLinejoin="round"
                  data-key={key}
                  onMouseEnter={h.onMouseEnter}
                  onMouseMove={h.onMouseMove}
                  onMouseLeave={h.onMouseLeave}
                />
              );
            })}
            {active && (
              <path d={path(active) ?? ""} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            )}
          </g>
          <path d={outline} fill="none" stroke="var(--input)" strokeWidth={0.8} pointerEvents="none" />
        </svg>
        {active && (
          <InkTip
            tipRef={tipRef}
            code={active.properties.iso3 || "—"}
            name={activeRow?.name ?? active.properties.name}
            lines={
              activeRow
                ? [`${nf.format(activeRow.n)} ${labels.studies.toLowerCase()}`, activeRow.group === "africa" ? labels.africa : labels.outside]
                : [labels.none ?? t("worldNone")]
            }
          />
        )}
      </div>
      {legend && (
        <MapLegend>
          {/* one legend per ramp; a group without any country (no data yet) is left out */}
          {minOf("africa") !== undefined && (
            <StepLegend
              title={labels.legendAfrica ?? labels.africa}
              colors={RAMPS.africa}
              labels={classLabels(breaks, { locale, metric: "authorship", min: minOf("africa") })}
              counts={countsA}
            />
          )}
          {minOf("outside") !== undefined && (
            <StepLegend
              title={labels.legendOutside ?? labels.outside}
              colors={RAMPS.outside}
              labels={classLabels(breaks, { locale, metric: "authorship", min: minOf("outside") })}
              counts={countsO}
            />
          )}
          <LegendKey kind="zero" label={labels.none ?? t("worldNone")} />
        </MapLegend>
      )}
      {(caption !== undefined || fig !== undefined) && <Caption fig={fig}>{caption}</Caption>}
    </Root>
  );
}

