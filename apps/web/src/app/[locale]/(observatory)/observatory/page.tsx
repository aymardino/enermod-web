"use client";

import { useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Download, Rows3 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, type CountrySummary, type Overview, type YearRow } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Key } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { IsoCode, Meter, Table, TBody, TD, TH, THead, TR, countryLinkClass } from "@/components/ui/table";
import { Callout, Kpi, KpiStrip } from "@/components/observatory/kpi";
import { Block, PageHead } from "@/components/observatory/page-head";
import { LevelFilter } from "@/components/observatory/filters";
import { AfricaMap } from "@/components/observatory/africa-map";
import { OriginBar, RowBars, YearBars, YearLegend } from "@/components/observatory/charts";
import { AFRICA_COUNTRIES, StudyCard, StudyLedger, countryInfo } from "@/components/observatory/study-card";
import { useRecentStudies } from "@/components/observatory/home-live";

type Scope = "all" | "full" | "light";
const CURRENT_YEAR = new Date().getFullYear();
const WRAP = "mx-auto w-full max-w-[1248px] px-8 pb-[72px] pt-10 max-md:px-4 2xl:max-w-[1400px]";
const GRID = "grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-12 max-lg:grid-cols-[minmax(0,1fr)]";

/** Studies of a country for the scope. */
const countOf = (x: CountrySummary, scope: Scope) => (scope === "full" ? x.n_full : scope === "light" ? x.n_light : x.n_studies);

export default function DashboardPage() {
  const t = useTranslations("observatory.dashboard");
  const c = useTranslations("common");
  const tc = useTranslations("ui.chart");
  const tm = useTranslations("observatory.map");
  const label = useLabel();
  const locale = useLocale();
  const f = useFormatter();
  const ov = useQuery<Overview>({ queryKey: ["overview"], queryFn: () => api.get("/stats/overview") });
  const countries = useQuery<CountrySummary[]>({ queryKey: ["countries"], queryFn: () => api.get("/countries") });
  const recent = useRecentStudies();
  const [scope, setScope] = useState<Scope>("all");
  const [yearTable, setYearTable] = useState(false);
  const d = ov.data;
  const pct = (v: number) => f.number(v / 100, { style: "percent", maximumFractionDigits: 0 });
  const nameOf = (x: CountrySummary) => (AFRICA_COUNTRIES[x.iso_code] ? countryInfo(x.iso_code, locale).name : x.country_name);

  const ranked = useMemo(
    () => [...(countries.data ?? [])].sort((a, b) => countOf(b, scope) - countOf(a, scope) || a.country_name.localeCompare(b.country_name)),
    [countries.data, scope],
  );
  const covered = countries.data ? countries.data.filter((x) => countOf(x, scope) > 0).length : null;

  // year chart for the scope: both scopes stacked, or one scope alone in its own hue
  const yearRows: YearRow[] = useMemo(
    () => (d?.by_year ?? []).map((r) => (scope === "all" ? r : { ...r, full: scope === "full" ? r.full : 0, light: scope === "light" ? r.light : 0 })),
    [d, scope],
  );
  const partialYear = (d?.by_year ?? []).some((r) => r.year === CURRENT_YEAR) ? CURRENT_YEAR : null;
  const yearLabels = { studies: c("studies"), full: t("scope.full"), light: t("scope.light") };

  const scopeTabs = d ? (
    <LevelFilter
      value={scope}
      onChange={setScope}
      counts={{ full: d.n_full, light: d.n_light }}
      labels={{ title: t("scope.title"), all: t("scope.all"), full: t("scope.full"), light: t("scope.light") }}
      hideHelp
    />
  ) : undefined;

  return (
    <div className={WRAP}>
      <PageHead section="dashboard" beta title={t("title")} lede={t("lede")} aside={scopeTabs} />

      {!d ? (
        <Skeleton className="mt-[30px] h-[132px] w-full border-t-2 border-rule" />
      ) : (
        <>
          <KpiStrip className="mt-[30px]">
            <Kpi
              label={c("studies")}
              value={f.number(scope === "all" ? d.n_studies : scope === "full" ? d.n_full : d.n_light)}
              hint={scope === "all" ? t("studiesHint", { full: d.n_full, light: d.n_light }) : t("ofStudies", { n: d.n_studies })}
              href={scope === "all" ? "/observatory/studies" : `/observatory/studies?level=${scope}`}
            />
            <Kpi
              label={t("countriesCovered")}
              value={scope === "all" ? f.number(d.countries_covered) : covered === null ? "–" : f.number(covered)}
              suffix={`/${f.number(d.n_countries)}`}
              hint={scope === "all" ? t("countriesHint", { n: d.n_countries }) : t(scope === "full" ? "countriesFull" : "countriesLight")}
            />
            <Kpi label={c("tools")} value={f.number(d.n_tools)} hint={t("toolsUsed", { n: d.n_tools_used })} href="/observatory/tools" />
            <Kpi
              label={t("africanLed")}
              value={pct(scope === "all" ? d.origin.african_led_pct : scope === "full" ? d.african_led_full_pct : d.african_led_light_pct)}
              hint={
                scope === "all"
                  ? t("africanLedHint", { full: d.african_led_full_pct, light: d.african_led_light_pct })
                  : t(scope === "full" ? "africanLedFull" : "africanLedLight")
              }
            />
            <Kpi label={t("open")} value={pct(d.open_pct)} hint={t("openHint", { n: d.open_assessed })} />
          </KpiStrip>
          {scope !== "all" && <p className="mt-2.5 font-display text-[14.5px] leading-[1.45] text-muted-foreground">{t("bothScopes")}</p>}
        </>
      )}

      <div className={cn(GRID, "mt-11")}>
        <Block
          title={t("byYear")}
          description={t(scope === "all" ? "byYearDesc" : scope === "full" ? "byYearDescFull" : "byYearDescLight")}
          actions={
            <Button variant="ghost" size="xs" aria-pressed={yearTable} onClick={() => setYearTable((v) => !v)}>
              <Rows3 strokeWidth={1.4} aria-hidden="true" />
              {yearTable ? t("chart") : t("table")}
            </Button>
          }
          contentClassName="mt-3"
        >
          {!d ? (
            <Skeleton className="h-[250px] w-full" />
          ) : yearTable ? (
            <Table>
              <THead>
                <TR>
                  <TH>{t("year")}</TH>
                  {scope !== "light" && <TH numeric>{t("scope.full")}</TH>}
                  {scope !== "full" && <TH numeric>{t("scope.light")}</TH>}
                  {scope === "all" && <TH numeric>{t("total")}</TH>}
                </TR>
              </THead>
              <TBody>
                {[...d.by_year].sort((a, b) => b.year - a.year).map((r) => (
                  <TR key={r.year}>
                    <TD className="tabular-nums">{r.year === partialYear ? tc("yearToDate", { year: String(r.year) }) : r.year}</TD>
                    {scope !== "light" && <TD numeric>{f.number(r.full)}</TD>}
                    {scope !== "full" && <TD numeric>{f.number(r.light)}</TD>}
                    {scope === "all" && <TD numeric className="font-semibold">{f.number(r.full + r.light)}</TD>}
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <>
              {scope === "all" ? (
                <YearLegend labels={yearLabels} partialYear={partialYear} className="mb-2.5" />
              ) : (
                <div className="mb-2.5 flex flex-wrap gap-x-[18px] gap-y-1.5 text-[12.5px] leading-tight">
                  <span className="inline-flex items-center gap-[7px]"><Key kind={scope} size="lg" />{t(`scope.${scope}`)}</span>
                  {partialYear && (
                    <span className="inline-flex items-center gap-[7px] text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-3 flex-none",
                          scope === "full"
                            ? "bg-[repeating-linear-gradient(45deg,var(--full)_0_1.3px,var(--background)_1.3px_3.4px)] shadow-[inset_0_0_0_1px_var(--full)]"
                            : "bg-[repeating-linear-gradient(45deg,var(--light)_0_1.3px,var(--background)_1.3px_3.4px)] shadow-[inset_0_0_0_1px_var(--light)]",
                        )}
                      />
                      {tc("yearToDate", { year: String(partialYear) })}
                    </span>
                  )}
                </div>
              )}
              <YearBars rows={yearRows} stacked legend={false} height={230} years={[d.year_min, d.year_max]} labels={yearLabels} ariaLabel={t("byYear")} />
            </>
          )}
        </Block>

        <Block title={t("whoLeads")} description={t("whoLeadsHint")}>
          {d ? (
            <OriginBar origin={d.origin} labels={{ african_led: t("origin.africanLed"), mixed: t("origin.mixed"), non_african: t("origin.nonAfrican") }}>
              <Callout tone="brand" className="mt-5">
                {t.rich("methodNote", { link: (chunks) => <Link href="/methodology">{chunks}</Link> })}
              </Callout>
            </OriginBar>
          ) : (
            <Skeleton className="h-44 w-full" />
          )}
        </Block>
      </div>

      <div className={cn(GRID, "mt-12")}>
        <Block
          title={t("mapTitle")}
          description={t("mapDesc")}
          actions={
            <Button variant="ghost" size="xs" asChild>
              <Link href="/observatory/map">{t("openMap")}<ArrowRight strokeWidth={1.5} aria-hidden="true" /></Link>
            </Button>
          }
        >
          {countries.data ? (
            <AfricaMap
              className="mx-auto max-w-[620px] lg:max-w-none"
              metric={scope === "all" ? "studies" : scope}
              data={countries.data.map((x) => ({
                iso3: x.iso3,
                value: countOf(x, scope),
                label: nameOf(x),
                hint: t("nTools", { n: x.n_tools }),
                href: `/observatory/countries/${x.iso_code}`,
              }))}
              legendTitle={scope === "all" ? t("mapTitle") : t(scope === "full" ? "legendFull" : "legendLight")}
              formatValue={(v) => tc("nStudies", { n: v })}
              callout
              ariaLabel={t("mapTitle")}
            />
          ) : (
            <Skeleton className="aspect-[600/640] w-full" />
          )}
        </Block>
        <div className="min-w-0 space-y-12">
          <Block
            title={t("topTools")}
            description={t("topToolsHint")}
            actions={<Button variant="ghost" size="xs" asChild><Link href="/observatory/tools">{c("viewAll")}</Link></Button>}
          >
            {d ? (
              <RowBars
                ariaLabel={t("topTools")}
                rows={d.top_tools.map((x) => ({ label: x.tool, value: x.studies, href: `/observatory/tools/${encodeURIComponent(x.tool)}` }))}
              />
            ) : (
              <Skeleton className="h-80 w-full" />
            )}
          </Block>
          <Block title={t("pools")} description={t("poolsHint")}>
            {d ? (
              <RowBars
                ariaLabel={t("pools")}
                rows={[...d.pools].sort((a, b) => b.studies - a.studies).map((p) => ({ label: p.code, value: p.studies, detail: p.name }))}
              />
            ) : (
              <Skeleton className="h-44 w-full" />
            )}
          </Block>
        </div>
      </div>

      <Block
        className="mt-12"
        title={t("tableTitle")}
        description={t("tableDesc")}
        actions={
          <Button variant="ghost" size="xs" asChild>
            <a href={api.url("/export/countries.csv")} aria-label={t("csvLabel")}>
              <Download strokeWidth={1.4} aria-hidden="true" />
              {t("csv")}
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
                <TH numeric sort="descending">{scope === "all" ? c("studies") : t(`scope.${scope}`)}</TH>
                <TH numeric lowPriority>{c("tools")}</TH>
                <TH numeric>{t("gapScore")}</TH>
                <TH numeric>{t("readiness")}</TH>
                <TH lowPriority>{tm("region")}</TH>
                <TH lowPriority>{tm("pool")}</TH>
              </TR>
            </THead>
            <TBody>
              {ranked.map((x) => (
                <TR key={x.iso_code}>
                  <TD>
                    <IsoCode>{x.iso3}</IsoCode>
                    <Link href={`/observatory/countries/${x.iso_code}`} className={countryLinkClass}>{nameOf(x)}</Link>
                  </TD>
                  <TD numeric>{f.number(countOf(x, scope))}</TD>
                  <TD numeric lowPriority>{f.number(x.n_tools)}</TD>
                  <TD numeric><Meter value={x.gap_score} max={100} label={f.number(x.gap_score, { maximumFractionDigits: 0 })} /></TD>
                  <TD numeric>
                    <Meter
                      value={x.readiness_score}
                      max={10}
                      label={x.readiness_score === null ? undefined : f.number(x.readiness_score, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      empty={t("notRanked")}
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
        <p className="mt-2.5 text-[12.5px] leading-[1.5] text-muted-foreground">{t("tableNote")}</p>
      </Block>

      <Block
        className="mt-12"
        title={t("latest")}
        description={t("latestHint")}
        actions={<Button variant="outline" size="sm" asChild><Link href="/observatory/studies?sort=recent">{c("viewAll")}</Link></Button>}
        contentClassName="mt-3"
      >
        {recent.data ? (
          <StudyLedger ruled={false} className="[&>article:last-child]:border-b-0">
            {recent.data.items.map((s) => <StudyCard key={s.study_id} compact s={s} />)}
          </StudyLedger>
        ) : (
          <Skeleton className="h-80 w-full" />
        )}
      </Block>
    </div>
  );
}
