"use client";

import { useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { api, qs, type CountrySummary, type Facets, type StudyPage } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { IsoCode, Meter, Table, TBody, TD, TH, THead, TR, countryLinkClass } from "@/components/ui/table";
import { AfricaMap, type MapMetric } from "@/components/observatory/africa-map";
import { ChipGroup, FilterPanel, RadioTabs, YearRange } from "@/components/observatory/filters";
import { Block, PageHead } from "@/components/observatory/page-head";
import { RowBars } from "@/components/observatory/charts";
import { AFRICA_COUNTRIES, countryInfo } from "@/components/observatory/study-card";

type Metric = "studies" | "full" | "light" | "tools" | "gap" | "readiness";
const METRICS: Metric[] = ["studies", "full", "light", "tools", "gap", "readiness"];
const WRAP = "mx-auto w-full max-w-[1248px] px-8 pb-[72px] pt-10 max-md:px-4 2xl:max-w-[1400px]";
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function MapPage() {
  const t = useTranslations("observatory.map");
  const td = useTranslations("observatory.dashboard");
  const c = useTranslations("common");
  const tc = useTranslations("ui.chart");
  const label = useLabel();
  const locale = useLocale();
  const f = useFormatter();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("studies");
  const [levels, setLevels] = useState<string[]>([]);
  const [scales, setScales] = useState<string[]>([]);
  const [years, setYears] = useState<[number, number]>([2000, 2026]);
  const facets = useQuery<Facets>({ queryKey: ["facets"], queryFn: () => api.get("/studies/facets"), staleTime: 600_000 });
  const countries = useQuery<CountrySummary[]>({ queryKey: ["countries"], queryFn: () => api.get("/countries") });
  const yearMin = facets.data?.year_min ?? 2000;
  const yearMax = facets.data?.year_max ?? 2026;
  const yearsFiltered = years[0] > yearMin || years[1] < yearMax;
  const filtering = levels.length > 0 || scales.length > 0 || yearsFiltered;
  // When study filters are active, count studies per country on the filtered set (one request, all cards).
  const filtered = useQuery<StudyPage>({
    queryKey: ["map-studies", levels, scales, years],
    queryFn: () => api.get(`/studies${qs({ level: levels, scale: scales, year_min: years[0], year_max: years[1], page_size: 200, page: 1 })}`),
    enabled: filtering,
  });
  const counts = useMemo(() => {
    if (!filtering || !filtered.data) return null;
    const m = new Map<string, number>();
    for (const s of filtered.data.items) for (const iso of s.countries) m.set(iso, (m.get(iso) ?? 0) + 1);
    return m;
  }, [filtering, filtered.data]);
  const rows = useMemo(() => {
    if (!countries.data) return [];
    return countries.data.map((x) => {
      const v = metric === "studies" ? (counts ? counts.get(x.iso_code) ?? 0 : x.n_studies) : metric === "full" ? x.n_full : metric === "light" ? x.n_light
        : metric === "tools" ? x.n_tools : metric === "gap" ? x.gap_score : x.readiness_score;
      return { ...x, value: v };
    });
  }, [countries.data, metric, counts]);
  const sorted = [...rows].sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || a.country_name.localeCompare(b.country_name));
  const partial = filtering && filtered.data && filtered.data.total > 200;

  const nameOf = (x: CountrySummary) => (AFRICA_COUNTRIES[x.iso_code] ? countryInfo(x.iso_code, locale).name : x.country_name);
  const studiesOf = (x: CountrySummary) => (metric === "full" ? x.n_full : metric === "light" ? x.n_light : counts ? counts.get(x.iso_code) ?? 0 : x.n_studies);
  const isCount = metric === "studies" || metric === "full" || metric === "light" || metric === "tools";
  // the five fixed classes follow the metric; a filtered study count limited to one scope uses that scope's breaks
  const mapMetric: MapMetric =
    metric === "studies" && counts && levels.length === 1 ? (levels[0] === "full" ? "full" : "light") : metric;
  const legendTitle = metric === "studies" && counts ? t("legend.filtered") : t(`legend.${metric}`);
  const digits = metric === "readiness" ? 1 : 0;
  const fmtValue = (v: number) =>
    metric === "tools" ? td("nTools", { n: v })
      : isCount ? tc("nStudies", { n: v })
        : `${f.number(v, { minimumFractionDigits: digits, maximumFractionDigits: digits })}/${metric === "gap" ? 100 : 10}`;
  const activeCount = levels.length + scales.length + (yearsFiltered ? 1 : 0);
  const reset = () => { setLevels([]); setScales([]); setYears([yearMin, yearMax]); };

  const colourBy = (className: string, wrap: boolean) => (
    <RadioTabs
      className={className}
      label={t("metric")}
      wrap={wrap}
      value={metric}
      onChange={(v) => setMetric(v as Metric)}
      options={METRICS.map((m) => ({ value: m, label: t(`metrics.${m}`) }))}
    />
  );
  const sortCol: "studies" | "tools" | "gap" | "readiness" = metric === "full" || metric === "light" ? "studies" : metric;

  return (
    <div className={WRAP}>
      <PageHead section="map" title={t("title")} lede={t("lede")} />

      <div className="mt-[30px] grid grid-cols-[260px_minmax(0,1fr)] gap-12 max-lg:grid-cols-[minmax(0,1fr)] max-lg:gap-5">
        <FilterPanel sticky activeCount={activeCount} onReset={reset}>
          {colourBy("max-lg:hidden", true)}
          <ChipGroup label={t("scope")} value={levels} onChange={setLevels} options={[{ value: "full", label: label("level", "full") }, { value: "light", label: label("level", "light") }]} />
          <ChipGroup label={t("scale")} value={scales} onChange={setScales} options={(facets.data?.scale ?? []).map((o) => ({ value: o.value, label: label("scale", o.value), n: o.n }))} />
          <YearRange min={yearMin} max={yearMax} value={years} onChange={setYears} label={t("years")} />
          <div className="text-[12.5px] leading-[1.45] text-muted-foreground">
            <p>{t("filtersHint")}</p>
            {partial && <p className="mt-2 text-amber-700">{t("partial", { n: 200, total: filtered.data!.total })}</p>}
          </div>
        </FilterPanel>

        <div className="min-w-0">
          {colourBy("mb-5 lg:hidden", false)}
          {countries.data ? (
            <AfricaMap
              className="max-w-[720px]"
              metric={mapMetric}
              data={rows.map((x) => ({
                iso3: x.iso3,
                value: x.value,
                label: nameOf(x),
                hint: metric === "tools" ? tc("nStudies", { n: x.n_studies }) : td("nTools", { n: x.n_tools }),
                href: `/observatory/countries/${x.iso_code}`,
              }))}
              legendTitle={legendTitle}
              emptyLabel={capitalise(metric === "readiness" ? td("notRanked") : label("governance", ""))}
              formatValue={fmtValue}
              callout={isCount}
              onSelect={(iso3) => { const cc = countries.data!.find((x) => x.iso3 === iso3); if (cc) router.push(`/observatory/countries/${cc.iso_code}`); }}
              fig={1}
              caption={t("figCaption", { metric: legendTitle })}
              ariaLabel={legendTitle}
            />
          ) : (
            <Skeleton className="aspect-[600/640] w-full max-w-[720px]" />
          )}

          <Block className="mt-12" title={t("ranking")} description={`${t("rankingHint")} ${legendTitle}.`}>
            {countries.data ? (
              <RowBars
                ariaLabel={t("rankingAria")}
                format={(v) => f.number(v, { minimumFractionDigits: digits, maximumFractionDigits: digits })}
                rows={sorted.filter((x) => x.value !== null).slice(0, 15).map((x) => ({ label: nameOf(x), value: x.value ?? 0, href: `/observatory/countries/${x.iso_code}` }))}
              />
            ) : (
              <Skeleton className="h-[510px] w-full" />
            )}
          </Block>

          <Block
            className="mt-12"
            title={t("table")}
            description={t("tableDesc")}
            actions={
              <Button variant="ghost" size="xs" asChild>
                <a href={api.url("/export/countries.csv")} aria-label={td("csvLabel")}>
                  <Download strokeWidth={1.4} aria-hidden="true" />
                  {td("csv")}
                </a>
              </Button>
            }
            contentClassName="mt-3"
          >
            {countries.data ? (
              <Table stickyFirst>
                <THead>
                  <TR>
                    <TH>{c("country")}</TH>
                    <TH numeric sort={sortCol === "studies" ? "descending" : undefined}>{metric === "full" || metric === "light" ? t(`metrics.${metric}`) : c("studies")}</TH>
                    <TH numeric lowPriority sort={sortCol === "tools" ? "descending" : undefined}>{c("tools")}</TH>
                    <TH numeric sort={sortCol === "gap" ? "descending" : undefined}>{t("metrics.gap")}</TH>
                    <TH numeric sort={sortCol === "readiness" ? "descending" : undefined}>{td("readiness")}</TH>
                    <TH lowPriority>{t("region")}</TH>
                    <TH lowPriority>{t("pool")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((x) => (
                    <TR key={x.iso_code}>
                      <TD>
                        <IsoCode>{x.iso3}</IsoCode>
                        <Link href={`/observatory/countries/${x.iso_code}`} className={countryLinkClass}>{nameOf(x)}</Link>
                      </TD>
                      <TD numeric>{f.number(studiesOf(x))}</TD>
                      <TD numeric lowPriority>{f.number(x.n_tools)}</TD>
                      <TD numeric><Meter value={x.gap_score} max={100} label={f.number(x.gap_score, { maximumFractionDigits: 0 })} /></TD>
                      <TD numeric>
                        <Meter
                          value={x.readiness_score}
                          max={10}
                          label={x.readiness_score === null ? undefined : f.number(x.readiness_score, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          empty={td("notRanked")}
                        />
                      </TD>
                      <TD lowPriority>{label("region", x.region)}</TD>
                      <TD lowPriority>{x.power_pool}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <Skeleton className="h-96 w-full" />
            )}
            <p className="mt-2.5 text-[12.5px] leading-[1.5] text-muted-foreground">{td("tableNote")}</p>
          </Block>
        </div>
      </div>
    </div>
  );
}
