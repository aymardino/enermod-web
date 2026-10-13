"use client";

import { FileText, Globe2, Users, Wrench } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, qs, type CountrySummary, type Overview, type StudyPage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Key } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { Callout, Caption, Fig, Figs } from "@/components/observatory/kpi";
import { AfricaMap } from "@/components/observatory/africa-map";
import { OriginBar, RowBars, ShareBar, YearBars, YearLegend } from "@/components/observatory/charts";
import { AFRICA_COUNTRIES, StudyCard, StudyEntries, countryInfo } from "@/components/observatory/study-card";

/* The live parts of the home page: every figure comes from the API and updates with the
   inventory. The page itself (server) sets the static copy around them. */

const CURRENT_YEAR = new Date().getFullYear();
const H2 = "text-balance font-display text-[30px] font-bold leading-[1.08] tracking-[-0.015em] md:text-[40px]";
const H3 = "font-display text-[23px] font-semibold leading-[1.2] tracking-[-0.005em]";
const DESC = "mt-1 max-w-[46em] text-[13px] leading-[1.5] text-muted-foreground";
const SUBLEDE = "max-w-[44em] font-display text-[17px] leading-[1.5] text-ink-2 md:text-[18.5px]";

function useOverview() {
  return useQuery<Overview>({ queryKey: ["overview"], queryFn: () => api.get("/stats/overview") }).data;
}
function useCountries() {
  return useQuery<CountrySummary[]>({ queryKey: ["countries"], queryFn: () => api.get("/countries") }).data;
}
/** The six most recent studies with their full cards (authors, tags, countries, source). Shared
 *  with the observatory overview, which lists all six. */
export function useRecentStudies() {
  return useQuery<StudyPage>({ queryKey: ["studies-recent", 6], queryFn: () => api.get(`/studies${qs({ sort: "recent", page_size: 6 })}`) });
}

/** Country name in the visitor's language (the API names are English). */
function nameOf(c: CountrySummary, locale: string) {
  return AFRICA_COUNTRIES[c.iso_code] ? countryInfo(c.iso_code, locale).name : c.country_name;
}

/** Fig. 1: the equal-area plate of studies per country, with its stepped legend and caption. */
export function HeroMap({ className, compact = false }: { className?: string; compact?: boolean }) {
  const t = useTranslations("home");
  const td = useTranslations("observatory.dashboard");
  const tc = useTranslations("ui.chart");
  const locale = useLocale();
  const ov = useOverview();
  const countries = useCountries();
  if (!ov || !countries) {
    return (
      <div className={cn("min-w-0", className)} aria-busy="true">
        <Skeleton className="aspect-[600/640] w-full" />
        <Skeleton className="mt-4 h-[74px] w-full" />
      </div>
    );
  }
  return (
    <AfricaMap
      className={cn("max-md:-mx-2 max-md:[&>*+*]:mx-2", className)}
      metric="studies"
      data={countries.map((x) => ({
        iso3: x.iso3,
        value: x.n_studies,
        label: nameOf(x, locale),
        hint: td("nTools", { n: x.n_tools }),
        href: `/observatory/countries/${x.iso_code}`,
      }))}
      legendTitle={td("mapTitle")}
      formatValue={(v) => tc("nStudies", { n: v })}
      callout
      fig={compact ? undefined : 1}
      caption={compact ? undefined : t("fig1", { from: String(ov.year_min), to: String(ov.year_max) })}
      ariaLabel={t("mapAria")}
    />
  );
}

/** "The inventory today": the 2×2 figures, the most/least modelled aside and the footnote. */
export function HeroFigures({ className }: { className?: string }) {
  const t = useTranslations("home");
  const td = useTranslations("observatory.dashboard");
  const f = useFormatter();
  const locale = useLocale();
  const d = useOverview();
  const countries = useCountries();
  const ranked = countries ? [...countries].sort((a, b) => b.n_studies - a.n_studies || a.country_name.localeCompare(b.country_name)) : [];
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3 pb-[9px]">
        <h2 className="sc">{t("kpiTitle")}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 bg-rubric" />
          {t("live")}
        </span>
      </div>
      {d ? (
        <Figs>
          <Fig
            label={t("kpis.studies")}
            value={f.number(d.n_studies)}
            hint={t("figs.studiesHint", { from: String(d.year_min), to: String(d.year_max), full: d.n_full, light: d.n_light })}
          />
          <Fig label={t("kpis.countries")} value={f.number(d.countries_covered)} suffix={`/${f.number(d.n_countries)}`} hint={td("countriesHint", { n: d.n_countries })} />
          <Fig label={t("kpis.tools")} value={f.number(d.n_tools)} hint={td("toolsUsed", { n: d.n_tools_used })} />
          <Fig
            label={t("kpis.africanLed")}
            value={f.number(d.origin.african_led_pct / 100, { style: "percent", maximumFractionDigits: 0 })}
            hint={t("kpis.africanLedHint", { full: d.african_led_full_pct, light: d.african_led_light_pct })}
          />
        </Figs>
      ) : (
        <Skeleton className="h-[262px] w-full border-t-2 border-rule" />
      )}
      {d && top && bottom && top !== bottom && (
        <Callout tone="brand" className="mt-[22px]">
          {t("aside", { top: nameOf(top, locale), n: top.n_studies, total: d.n_studies, bottom: nameOf(bottom, locale), m: bottom.n_studies })}
        </Callout>
      )}
      <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">{t("trust")}</p>
    </div>
  );
}

/** Fig. 1b, the data horizon: studies per publication year and scope, full width. */
export function HeroHorizon({ className, bare = false }: { className?: string; bare?: boolean }) {
  const t = useTranslations("home");
  const td = useTranslations("observatory.dashboard");
  const c = useTranslations("common");
  const d = useOverview();
  const labels = { studies: c("studies"), full: td("scope.full"), light: td("scope.light") };
  const rows = d?.by_year ?? [];
  const py = rows.some((r) => r.year === CURRENT_YEAR) ? CURRENT_YEAR : null;
  const complete = rows.filter((r) => py === null || r.year < py).sort((a, b) => a.year - b.year);
  const [r1, r2] = complete.slice(-2);
  return (
    <figure className={cn("min-w-0", !bare && "mt-11 border-t border-rule pt-3.5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <p className={cn("leading-[1.4]", bare ? "text-[15px] font-bold" : "text-[13px] font-semibold")}>{t("horizonTitle")}</p>
        <YearLegend labels={labels} partialYear={py} />
      </div>
      {d ? (
        <YearBars
          rows={rows}
          stacked
          legend={false}
          height={196}
          years={[d.year_min, d.year_max]}
          labels={labels}
          ariaLabel={t("horizonTitle")}
          className="mt-2.5 max-md:[&>div]:h-[170px]!"
        />
      ) : (
        <Skeleton className="mt-2.5 h-[196px] w-full max-md:h-[170px]" />
      )}
      {r1 && r2 && (
        <Caption fig={bare ? undefined : "Fig. 1b"}>
          {t("fig1b", {
            n1: r1.full + r1.light,
            y1: String(r1.year),
            n2: r2.full + r2.light,
            y2: String(r2.year),
            partial: py === null ? "none" : String(py),
          })}
        </Caption>
      )}
    </figure>
  );
}

/** Section 2: model scope, who leads the modelling, most used tools (three ruled columns). */
export function InventoryTrio() {
  const t = useTranslations("home");
  const td = useTranslations("observatory.dashboard");
  const f = useFormatter();
  const d = useOverview();
  const col = "min-w-0 pb-2 pt-5 max-md:pb-2.5 max-md:pt-[18px]";
  return (
    <div className="mt-[34px] grid grid-cols-3 border-t-2 border-rule max-xl:grid-cols-2 max-md:grid-cols-1">
      <div className={cn(col, "pr-7 max-md:pr-0")}>
        <h3 className={H3}>{t("scopeHead")}</h3>
        {d ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-x-[18px]">
              {(["full", "light"] as const).map((k) => (
                <div key={k} className="min-w-0">
                  <p className="text-[38px] font-semibold leading-none tracking-[-0.03em]">{f.number(k === "full" ? d.n_full : d.n_light)}</p>
                  <p className="mt-2 flex items-start gap-[7px] text-[13.5px] font-semibold leading-[1.3]">
                    <Key kind={k} className="mt-[3px] size-[11px]" />
                    {td(`scope.${k}`)}
                  </p>
                  <p className="mt-[5px] text-[12.5px] leading-[1.45] text-muted-foreground">{t(k === "full" ? "scopeFullText" : "scopeLightText")}</p>
                </div>
              ))}
            </div>
            <ShareBar
              className="mt-[18px]"
              parts={[
                { key: "full", value: d.n_full, kind: "full", label: td("scope.full") },
                { key: "light", value: d.n_light, kind: "light", label: td("scope.light") },
              ]}
            />
          </>
        ) : (
          <Skeleton className="mt-4 h-40 w-full" />
        )}
      </div>
      <div className={cn(col, "border-l border-border px-7 max-xl:pr-0 max-md:border-l-0 max-md:border-t max-md:px-0")}>
        <h3 className={H3}>{td("whoLeads")}</h3>
        <p className={DESC}>{t("whoLeadsDesc")}</p>
        {d ? (
          <OriginBar
            className="mt-[18px]"
            origin={d.origin}
            labels={{ african_led: td("origin.africanLed"), mixed: td("origin.mixed"), non_african: td("origin.nonAfrican") }}
          />
        ) : (
          <Skeleton className="mt-[18px] h-36 w-full" />
        )}
      </div>
      <div className={cn(col, "border-l border-border pl-7 max-xl:col-span-full max-xl:mt-3 max-xl:border-l-0 max-xl:border-t max-xl:pl-0 max-md:mt-0")}>
        <h3 className={H3}>{t("topToolsTitle")}</h3>
        <p className={DESC}>{t("topToolsDesc")}</p>
        {d ? (
          <RowBars
            className="mt-3.5"
            ariaLabel={t("topToolsTitle")}
            rows={d.top_tools.slice(0, 6).map((x) => ({ label: x.tool, value: x.studies, href: `/observatory/tools/${encodeURIComponent(x.tool)}` }))}
          />
        ) : (
          <Skeleton className="mt-3.5 h-52 w-full" />
        )}
        <p className="mt-4 text-sm">
          <Link href="/observatory/tools" className="link inline-block py-[3px]">
            {d ? t("allToolsN", { n: d.n_tools }) : t("allTools")}
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Section 3: the three most recent studies as full entries, with "View all n". */
export function LatestEntries() {
  const t = useTranslations("home");
  const td = useTranslations("observatory.dashboard");
  const c = useTranslations("common");
  const { data } = useRecentStudies();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className={H2}>{t("latestTitle")}</h2>
          <p className={cn(SUBLEDE, "mt-2.5")}>{td("latestHint")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/observatory/studies?sort=recent">{data ? t("viewAllN", { n: data.total }) : c("viewAll")}</Link>
        </Button>
      </div>
      {data ? (
        <StudyEntries className="mt-[30px]">
          {data.items.slice(0, 3).map((s) => <StudyCard key={s.study_id} s={s} />)}
        </StudyEntries>
      ) : (
        <Skeleton className="mt-[30px] h-72 w-full border-t-2 border-rule" />
      )}
    </>
  );
}

/** The bus label's record count in "How the inventory stays alive" ("1,053 records"). */
export function RecordCount() {
  const t = useTranslations("home.living");
  const d = useOverview();
  return d ? <>{t("records", { n: d.n_studies })}</> : null;
}

/** Key figures band of the home page: four large numbers in a white card. */
export function HeroStats({ className }: { className?: string }) {
  const t = useTranslations("home");
  const td = useTranslations("observatory.dashboard");
  const f = useFormatter();
  const d = useOverview();
  const items = d
    ? [
        { icon: FileText, value: f.number(d.n_studies), label: t("kpis.studies"), hint: t("figs.studiesHint", { from: String(d.year_min), to: String(d.year_max), full: d.n_full, light: d.n_light }) },
        { icon: Globe2, value: `${f.number(d.countries_covered)}/${f.number(d.n_countries)}`, label: t("kpis.countries"), hint: td("countriesHint", { n: d.n_countries }) },
        { icon: Wrench, value: f.number(d.n_tools), label: t("kpis.tools"), hint: td("toolsUsed", { n: d.n_tools_used }) },
        { icon: Users, value: f.number(d.origin.african_led_pct / 100, { style: "percent", maximumFractionDigits: 0 }), label: t("kpis.africanLed"), hint: t("kpis.africanLedHint", { full: d.african_led_full_pct, light: d.african_led_light_pct }) },
      ]
    : [];
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-[0_12px_32px_-12px_rgb(16_24_40/0.25)]", className)}>
      {d ? (
        <dl className="grid grid-cols-4 divide-x divide-border max-lg:grid-cols-2 max-lg:divide-x-0 max-md:grid-cols-1">
          {items.map((it) => (
            <div key={it.label} className="flex gap-4 p-6 max-lg:border-b max-lg:border-border max-md:p-5">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                <it.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <dt className="text-[14px] font-medium text-muted-foreground">{it.label}</dt>
                <dd className="mt-1 text-[34px] font-bold leading-none text-brand-800">{it.value}</dd>
                <dd className="mt-2 text-[13px] leading-[1.45] text-muted-foreground">{it.hint}</dd>
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <Skeleton className="h-[132px] w-full" />
      )}
    </div>
  );
}
