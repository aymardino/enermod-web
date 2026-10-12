"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type CountryDetail } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { CoverageBars, OriginBar, RowBars, YearBars } from "@/components/observatory/charts";
import { Callout, Kpi, Section } from "@/components/observatory/kpi";
import { StudyCard } from "@/components/observatory/study-card";

export default function CountryPage() {
  const { iso } = useParams<{ iso: string }>();
  const t = useTranslations("observatory.country");
  const c = useTranslations("common");
  const label = useLabel();
  const { data: d, error, isLoading } = useQuery<CountryDetail>({ queryKey: ["country", iso], queryFn: () => api.get(`/countries/${iso}`), retry: false });
  useEffect(() => { if (d) track("country_view", d.iso_code); }, [d]);
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-8"><Skeleton className="h-10 w-1/2" /><Skeleton className="mt-6 h-64" /></div>;
  if (error || !d) return <div className="mx-auto max-w-6xl px-4 py-8"><EmptyState title={error instanceof ApiError && error.status === 404 ? t("notFound") : c("error")} action={<Button asChild><Link href="/observatory/map">{t("back")}</Link></Button>} /></div>;
  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-8 sm:px-6">
      <Link href="/observatory/map" className="text-sm text-muted-foreground hover:text-foreground">← {t("back")}</Link>
      <div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline">{label("region", d.region)}</Badge>{d.pool && <Badge variant="outline">{d.pool.pool_name} ({d.power_pool})</Badge>}<Badge variant="outline">{d.iso_code} · {d.iso3}</Badge></div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{d.country_name}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={c("studies")} value={d.n_studies} hint={`${d.n_full} ${c("full").toLowerCase()} · ${d.n_light} ${c("light").toLowerCase()}`} tone="brand" />
        <Kpi label={t("distinctTools")} value={d.n_tools} hint={t("nationalStudies", { n: d.national_studies })} />
        <Kpi label={t("readiness")} value={d.readiness_score === null ? t("notRanked") : `${d.readiness_score}/10`} hint={t("readinessHint")} />
        <Kpi label={t("gap")} value={`${d.gap_score}/100`} hint={t("gapHint")} tone="coral" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label={t("governance")} value={<span className="text-xl">{label("governance", d.energy_governance)}</span>} hint={d.rise_governance_score !== null ? `RISE ${d.rise_governance_score}` : "RISE –"} />
        <Kpi label={t("data")} value={<span className="text-xl">{label("data", d.data_availability)}</span>} hint={d.data_transparency_score !== null ? `Ember ${d.data_transparency_score}/5` : "Ember –"} />
        <Kpi label={t("elec")} value={`${Math.round(d.electrification_rate)}%`} hint={d.electrification_year ? `WDI ${d.electrification_year}` : "WDI"} />
        <Kpi label="NDC" value={<span className="text-xl">{label("yesno", d.has_ndc)}</span>} hint="UNFCCC" />
        <Kpi label={t("lts")} value={<span className="text-xl">{label("yesno", d.has_lts)}</span>} hint="UNFCCC" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-semibold">{t("byYear")}</p><YearBars rows={d.by_year} stacked height={220} labels={{ studies: c("studies"), full: c("full"), light: c("light") }} /></div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-semibold">{t("toolsUsed")}</p>{d.tools.length ? <RowBars className="mt-3" rows={d.tools.slice(0, 10).map((x) => ({ label: x.tool, value: x.studies, href: `/observatory/tools/${encodeURIComponent(x.tool)}` }))} /> : <p className="mt-2 text-sm text-muted-foreground">{t("noStudies")}</p>}</div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-semibold">{t("whoModels")}</p><div className="mt-3"><OriginBar origin={d.origin} labels={{ african_led: label("origin", "african_led"), mixed: label("origin", "mixed"), non_african: label("origin", "non_african") }} /></div><p className="mt-2 text-xs text-muted-foreground">{t("africanLedCount", { n: d.african_led })}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-semibold">{t("features")}</p><CoverageBars rows={d.features.map((f) => ({ label: label("feature", f.key), pct: f.pct, positive: f.positive, assessed: f.assessed }))} height={220} /><p className="mt-1 text-xs text-muted-foreground">{t("featuresHint")}</p></div>
      </div>
      <Callout className="mt-6">{t("caveat")} <Link href="/methodology" className="underline">{t("methodLink")}</Link></Callout>
      <Section title={t("studiesTitle", { n: d.studies.length })} lede={t("studiesLede")}>
        <div className="space-y-3">{d.studies.slice(0, 40).map((s) => <StudyCard key={s.study_id} s={s} />)}</div>
        {d.studies.length > 40 && <Button variant="outline" className="mt-4" asChild><Link href={`/observatory/studies?country=${d.iso_code}`}>{t("allStudies", { n: d.studies.length })}</Link></Button>}
      </Section>
    </div>
  );
}
