"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type CountryDetail } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { CoverageBars, OriginBar, RowBars, YearBars } from "@/components/observatory/charts";
import { Callout, Caption, Kpi, KpiStrip } from "@/components/observatory/kpi";
import { Block, PageHead } from "@/components/observatory/page-head";
import { StudyCard, StudyLedger, countryInfo } from "@/components/observatory/study-card";

/** Page container of the observatory: 1248px, 1400px from 2xl, 32px gutters (16px on phones). */
const WRAP = "mx-auto w-full max-w-[1248px] px-8 pb-[72px] pt-10 max-md:px-4 2xl:max-w-[1400px]";
/** Two ruled blocks side by side, one column below 1024px. */
const PAIR = "grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-12 max-lg:grid-cols-[minmax(0,1fr)]";
/** "not ranked", "not assessed" set as a KPI value: italic serif, muted, never a figure. */
const NOT_ASSESSED = "text-[20px] font-normal tracking-normal text-muted-foreground";
/** The italic "none" line of an empty block. */
const EMPTY = "text-[15px] text-muted-foreground";

export default function CountryPage() {
  const { iso } = useParams<{ iso: string }>();
  const t = useTranslations("observatory.country");
  const c = useTranslations("common");
  const label = useLabel();
  const locale = useLocale();
  const format = useFormatter();
  const { data: d, error, isLoading } = useQuery<CountryDetail>({ queryKey: ["country", iso], queryFn: () => api.get(`/countries/${iso}`), retry: false });
  useEffect(() => { if (d) track("country_view", d.iso_code); }, [d]);

  const back = (
    <Link href="/observatory/map" className="inline-flex min-h-6 items-center gap-1.5 text-[13px] text-muted-foreground no-underline hover:text-foreground">
      <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      {t("back")}
    </Link>
  );

  if (isLoading) {
    return (
      <div className={WRAP} aria-busy="true">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-6 h-3 w-48" />
        <Skeleton className="mt-4 h-11 w-1/2" />
        <Skeleton className="mt-8 h-28" />
        <div className={cn(PAIR, "mt-11")}><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }
  if (error || !d) {
    return (
      <div className={WRAP}>
        <EmptyState
          title={error instanceof ApiError && error.status === 404 ? t("notFound") : c("error")}
          action={<Button asChild><Link href="/observatory/map">{t("back")}</Link></Button>}
        />
      </div>
    );
  }

  // English keeps the inventory's names; French takes them from the shared country list
  const info = countryInfo(d.iso_code, locale);
  const name = locale === "en" || !info.pool ? d.country_name : info.name;
  const kicker = [d.iso3, d.power_pool, label("region", d.region)].filter(Boolean).join(" · ");
  const pct = (v: number) => format.number(v / 100, { style: "percent", maximumFractionDigits: 0 });
  const originLabels = { african_led: label("origin", "african_led"), mixed: label("origin", "mixed"), non_african: label("origin", "non_african") };
  const studiesHref = `/observatory/studies?country=${d.iso_code}`;

  return (
    <div className={WRAP}>
      {back}
      <PageHead
        className="mt-5"
        kicker={kicker}
        title={name}
        lede={
          <>
            {t("lede")}
            {d.pool && <> {t("pool", { name: d.pool.pool_name, code: d.pool.pool_code })}</>}
          </>
        }
      />

      <KpiStrip className="mt-8">
        <Kpi label={c("studies")} value={format.number(d.n_studies)} hint={t("scopeHint", { full: d.n_full, light: d.n_light })} href={d.n_studies ? studiesHref : undefined} />
        <Kpi label={t("distinctTools")} value={format.number(d.n_tools)} hint={t("nationalStudies", { n: d.national_studies })} />
        <Kpi
          label={t("readiness")}
          value={
            d.readiness_score === null ? (
              <span className={cn(NOT_ASSESSED, "text-[26px]")}>{t("notRanked")}</span>
            ) : (
              `${format.number(d.readiness_score)}/10`
            )
          }
          hint={t("readinessHint")}
        />
        <Kpi label={t("gap")} value={`${format.number(d.gap_score)}/100`} hint={t("gapHint")} />
      </KpiStrip>
      <KpiStrip size="sm" className="mt-6">
        <Kpi
          label={t("governance")}
          value={d.energy_governance ? label("governance", d.energy_governance) : <span className={NOT_ASSESSED}>{label("governance", "")}</span>}
          hint={d.rise_governance_score !== null ? `RISE ${format.number(d.rise_governance_score)}` : "RISE –"}
        />
        <Kpi
          label={t("data")}
          value={d.data_availability ? label("data", d.data_availability) : <span className={NOT_ASSESSED}>{label("data", "")}</span>}
          hint={d.data_transparency_score !== null ? `Ember ${format.number(d.data_transparency_score)}/5` : "Ember –"}
        />
        <Kpi label={t("elec")} value={pct(d.electrification_rate)} hint={d.electrification_year ? `WDI ${d.electrification_year}` : "WDI"} />
        <Kpi label={t("ndc")} value={label("yesno", d.has_ndc)} hint={t("unfccc")} />
        <Kpi label={t("lts")} value={label("yesno", d.has_lts)} hint={t("unfccc")} />
      </KpiStrip>
      <Callout tone="brand" className="mt-5 max-w-[46em]">
        {t("caveat")} <Link href="/methodology">{t("methodLink")}</Link>
      </Callout>

      <div className={cn(PAIR, "mt-11")}>
        <Block title={t("byYear")} description={t("byYearLede")}>
          {d.by_year.length ? (
            <YearBars rows={d.by_year} stacked height={220} labels={{ studies: c("studies"), full: c("full"), light: c("light") }} ariaLabel={t("byYear")} />
          ) : (
            <p className={EMPTY}>{t("noStudies")}</p>
          )}
        </Block>
        <Block title={t("whoModels")} description={t("whoLede")}>
          <figure>
            <OriginBar origin={d.origin} labels={originLabels} />
            <Caption>{t("africanLedCount", { n: d.african_led })}</Caption>
          </figure>
        </Block>
      </div>

      <div className={cn(PAIR, "mt-12")}>
        <Block title={t("toolsUsed")} description={t("toolsLede")}>
          {d.tools.length ? (
            <RowBars
              rows={d.tools.slice(0, 10).map((x) => ({ label: x.tool, value: x.studies, href: `/observatory/tools/${encodeURIComponent(x.tool)}` }))}
              ariaLabel={t("toolsUsed")}
            />
          ) : (
            <p className={EMPTY}>{t("noStudies")}</p>
          )}
        </Block>
        <Block title={t("features")} description={t("featuresHint")}>
          <CoverageBars
            rows={d.features.map((f) => ({ label: label("feature", f.key), pct: f.pct, positive: f.positive, assessed: f.assessed }))}
            ariaLabel={t("features")}
          />
        </Block>
      </div>

      <Block className="mt-12" title={t("studiesTitle", { n: d.studies.length })} description={t("studiesLede")}>
        {d.studies.length ? (
          <StudyLedger ruled={false} className="border-t border-rule">
            {d.studies.slice(0, 40).map((s) => <StudyCard key={s.study_id} s={s} compact />)}
          </StudyLedger>
        ) : (
          <p className={EMPTY}>{t("noStudies")}</p>
        )}
        {d.studies.length > 40 && (
          <Button variant="outline" className="mt-6" asChild>
            <Link href={studiesHref}>{t("allStudies", { n: d.studies.length })}</Link>
          </Button>
        )}
      </Block>
    </div>
  );
}
