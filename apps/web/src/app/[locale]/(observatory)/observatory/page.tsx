"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, type CountrySummary, type Overview } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Kpi, Section, BetaBanner } from "@/components/observatory/kpi";
import { AfricaMap } from "@/components/observatory/africa-map";
import { OriginBar, RowBars, YearBars } from "@/components/observatory/charts";
import { StudyCard } from "@/components/observatory/study-card";

export default function DashboardPage() {
  const t = useTranslations("observatory.dashboard");
  const c = useTranslations("common");
  const label = useLabel();
  const ov = useQuery<Overview>({ queryKey: ["overview"], queryFn: () => api.get("/stats/overview") });
  const countries = useQuery<CountrySummary[]>({ queryKey: ["countries"], queryFn: () => api.get("/countries") });
  const d = ov.data;
  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-8 sm:px-6">
      <BetaBanner text={c("beta")} />
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{t("lede")}</p>
      {!d ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div> : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label={c("studies")} value={d.n_studies.toLocaleString()} hint={`${d.n_full} ${c("full").toLowerCase()} · ${d.n_light} ${c("light").toLowerCase()}`} tone="brand" />
          <Kpi label={t("countriesCovered")} value={`${d.countries_covered}/${d.n_countries}`} />
          <Kpi label={c("tools")} value={d.n_tools} hint={t("toolsUsed", { n: d.n_tools_used })} />
          <Kpi label={t("africanLed")} value={`${d.origin.african_led_pct}%`} hint={t("africanLedHint", { full: d.african_led_full_pct, light: d.african_led_light_pct })} />
          <Kpi label={t("open")} value={`${d.open_pct}%`} hint={t("openHint", { n: d.open_assessed })} />
        </div>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{t("mapTitle")}</h2><Button variant="ghost" size="sm" asChild><Link href="/observatory/map">{t("openMap")}<ArrowRight /></Link></Button></div>
          {countries.data ? (
            <AfricaMap data={countries.data.map((x) => ({ iso3: x.iso3, value: x.n_studies, label: x.country_name, href: `/observatory/countries/${x.iso_code}` }))}
              legend={{ low: "0", high: String(Math.max(...countries.data.map((x) => x.n_studies))) }} formatValue={(v) => `${v} ${c("studies").toLowerCase()}`} />
          ) : <Skeleton className="aspect-square w-full" />}
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="font-display text-xl font-semibold">{t("byYear")}</h2>
            {d ? <YearBars rows={d.by_year} stacked height={220} labels={{ studies: c("studies"), full: c("full"), light: c("light") }} /> : <Skeleton className="h-52" />}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="font-display text-xl font-semibold">{t("whoLeads")}</h2>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">{t("whoLeadsHint")}</p>
            {d && <OriginBar origin={d.origin} labels={{ african_led: label("origin", "african_led"), mixed: label("origin", "mixed"), non_african: label("origin", "non_african") }} />}
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title={t("topTools")} lede={t("topToolsHint")} className="mt-0" actions={<Button variant="outline" size="sm" asChild><Link href="/observatory/tools">{c("viewAll")}</Link></Button>}>
          {d && <RowBars rows={d.top_tools.map((x) => ({ label: x.tool, value: x.studies, href: `/observatory/tools/${encodeURIComponent(x.tool)}` }))} />}
        </Section>
        <Section title={t("pools")} lede={t("poolsHint")} className="mt-0">
          {d && <RowBars rows={d.pools.sort((a, b) => b.studies - a.studies).map((p) => ({ label: `${p.code}`, value: p.studies, hint: `${p.studies}` }))} color="var(--brand-400)" />}
        </Section>
      </div>
      {d && (
        <Section title={t("latest")} lede={t("latestHint")} actions={<Button variant="outline" size="sm" asChild><Link href="/observatory/studies?sort=recent">{c("viewAll")}</Link></Button>}>
          <div className="grid gap-3 md:grid-cols-3">
            {d.latest.slice(0, 6).map((s) => <StudyCard key={s.study_id} compact s={{ study_id: s.study_id, title: s.title, authors: "", year: s.year, model_name: "", tools: s.tools, countries: [], scale: "", level: "", open_source: "", local_ownership: "", study_category: "", link: "", source: s.source, grey_literature: "" }} />)}
          </div>
        </Section>
      )}
    </div>
  );
}
