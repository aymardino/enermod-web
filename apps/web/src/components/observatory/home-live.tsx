"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, type Overview } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Kpi } from "@/components/observatory/kpi";
import { WorldOriginMap } from "@/components/observatory/africa-map";
import { YearBars } from "@/components/observatory/charts";
import { StudyCard } from "@/components/observatory/study-card";
import { Wrench } from "lucide-react";

/** The live part of the home page: every figure comes from the API and updates with the inventory. */
export function HomeLive({ variant }: { variant: "hero" | "body" }) {
  const t = useTranslations("home");
  const c = useTranslations("common");
  const { data, isLoading } = useQuery<Overview>({ queryKey: ["overview"], queryFn: () => api.get("/stats/overview") });

  if (variant === "hero") {
    return (
      <div className="relative rounded-2xl border border-border bg-card p-5 shadow-pop">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("kpiTitle")}</p>
        {isLoading || !data ? (
          <div className="mt-3 grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Kpi label={t("kpis.studies")} value={data.n_studies.toLocaleString()} hint={`${data.year_min}–${data.year_max}`} tone="brand" />
              <Kpi label={t("kpis.countries")} value={`${data.countries_covered}/${data.n_countries}`} hint={t("kpis.countriesHint")} />
              <Kpi label={t("kpis.tools")} value={data.n_tools} hint={t("kpis.toolsHint", { n: data.n_tools_used })} />
              <Kpi label={t("kpis.africanLed")} value={`${data.origin.african_led_pct}%`} hint={t("kpis.africanLedHint", { full: data.african_led_full_pct, light: data.african_led_light_pct })} />
            </div>
            <div className="mt-3 rounded-xl border border-border bg-background p-3">
              <p className="mb-1 text-xs text-muted-foreground">{t("kpis.byYear")}</p>
              <YearBars rows={data.by_year} height={120} labels={{ studies: c("studies"), full: c("full"), light: c("light") }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("kpiNote")}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-12 sm:px-6 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("originTitle")}</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("originLede")}</p>
          <div className="mt-6 rounded-2xl border border-border bg-card p-3 shadow-card">
            {data ? <WorldOriginMap rows={data.origin_map} labels={{ africa: t("mapAfrica"), outside: t("mapOutside"), studies: c("studies") }} /> : <Skeleton className="h-72" />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("originCaption")}</p>
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-2xl font-semibold">{t("scopeTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("scopeText")}</p>
            {data && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-4"><p className="font-display text-3xl font-semibold text-brand-700 dark:text-brand-300">{data.n_full}</p><p className="mt-1 text-sm font-semibold">{t("fullTitle")}</p><p className="mt-1 text-xs text-muted-foreground">{t("fullText")}</p></div>
                <div className="rounded-xl border border-border bg-card p-4"><p className="font-display text-3xl font-semibold text-amber-700">{data.n_light}</p><p className="mt-1 text-sm font-semibold">{t("lightTitle")}</p><p className="mt-1 text-xs text-muted-foreground">{t("lightText")}</p></div>
              </div>
            )}
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-display text-2xl font-semibold"><Wrench className="size-5 text-brand-700" />{t("topToolsTitle")}</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {data?.top_tools.slice(0, 6).map((x) => (
                <li key={x.tool} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-1.5">
                  <Link href={`/observatory/tools/${encodeURIComponent(x.tool)}`} className="font-medium hover:text-primary">{x.tool}</Link><span className="tabular text-muted-foreground">{x.studies}</span>
                </li>
              ))}
            </ul>
            <Button variant="link" className="mt-1 px-0" asChild><Link href="/observatory/tools">{t("allTools")}<ArrowRight /></Link></Button>
          </div>
        </div>
      </div>
      {data && data.latest.length > 0 && (
        <div className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="font-display text-2xl font-semibold tracking-tight">{t("latestTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("latestText")}</p></div>
            <Button variant="outline" asChild><Link href="/observatory/studies?sort=recent">{c("viewAll")}</Link></Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {data.latest.slice(0, 3).map((s) => (
              <StudyCard key={s.study_id} compact s={{ study_id: s.study_id, title: s.title, authors: "", year: s.year, model_name: "", tools: s.tools, countries: [], scale: "", level: "", open_source: "", local_ownership: "", study_category: "", link: "", source: s.source, grey_literature: "" }} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
