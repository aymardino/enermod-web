"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Flag, GitBranch, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type ToolDetail } from "@/lib/api";
import { useLabel, useListLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { AfricaMap } from "@/components/observatory/africa-map";
import { OriginBar, RowBars, YearBars } from "@/components/observatory/charts";
import { Kpi, Section } from "@/components/observatory/kpi";
import { StudyCard } from "@/components/observatory/study-card";
import { PageHead } from "@/components/observatory/page-head";

const URL_RE = /https?:\/\/[^\s;,)\]]+/g;
function sources(text: string): { label: string; url: string }[] {
  const out: { label: string; url: string }[] = [];
  for (const seg of (text || "").split(";")) {
    const m = seg.match(URL_RE);
    if (!m) continue;
    const url = m[0].replace(/\.$/, "");
    let label = seg.slice(0, seg.indexOf(url)).trim().replace(/^[\s:,(-]+|[\s:,)-]+$/g, "");
    if (!label) label = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    out.push({ label, url });
  }
  return out;
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p><p className="mt-0.5 text-sm font-medium">{v}</p></div>;
}

export default function ToolPage() {
  const { name } = useParams<{ name: string }>();
  const decoded = decodeURIComponent(name);
  const t = useTranslations("observatory.tool");
  const nav = useTranslations("nav");
  const c = useTranslations("common");
  const locale = useLocale();
  const label = useLabel();
  const list = useListLabel();
  const { data: d, error, isLoading } = useQuery<ToolDetail>({ queryKey: ["tool", decoded], queryFn: () => api.get(`/tools/${encodeURIComponent(decoded)}`), retry: false });
  useEffect(() => { if (d) track("tool_view", d.tool_name); }, [d]);
  if (isLoading) return <div className="mx-auto max-w-[1800px] px-4 py-8 lg:px-12"><Skeleton className="h-10 w-1/2" /><Skeleton className="mt-6 h-64" /></div>;
  if (error || !d) return <div className="mx-auto max-w-[1800px] px-4 py-8 lg:px-12"><EmptyState title={error instanceof ApiError && error.status === 404 ? t("notFound") : c("error")} action={<Button asChild><Link href="/observatory/tools">{t("back")}</Link></Button>} /></div>;
  const src = sources(d.info_source);
  const m = d.metrics;
  return (
    <div className="mx-auto w-full max-w-[1800px] px-6 lg:px-12 pb-[72px] max-md:px-4">
      <PageHead
        crumbs={[{ label: nav("observatory"), href: "/observatory" }, { label: nav("obs.tools"), href: "/observatory/tools" }, { label: d.tool_name }]}
        title={d.tool_name}
        lede={<>{d.full_name}{d.origin_institution ? ` · ${d.origin_institution}` : ""}</>}
      >
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white">{label("license", d.license)}</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white">{label("type", d.type)}</span>
          {d.free_for_developing === "yes" && d.license !== "open_source" && <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white">{t("freeLic")}</span>}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {d.website_url && <Button size="sm" className="bg-white text-brand-800 hover:bg-brand-50" asChild><a href={d.website_url} target="_blank" rel="noreferrer"><ExternalLink />{t("website")}</a></Button>}
          {d.repo_url && <Button size="sm" className="bg-white text-brand-800 hover:bg-brand-50" asChild><a href={d.repo_url} target="_blank" rel="noreferrer"><GitBranch />{t("repository")}</a></Button>}
          <Button variant="outline" size="sm" className="border-white/70 bg-transparent text-white hover:bg-white/10" asChild><Link href={`/contribute?kind=correction&tool=${encodeURIComponent(d.tool_name)}`}><Flag />{t("suggest")}</Link></Button>
        </div>
      </PageHead>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t("africaStudies")} value={d.n_studies} hint={t("africaStudiesHint", { n: d.countries.length })} tone="brand" />
        <Kpi label={t("programming")} value={label("programming", d.programming_required)} hint={`${t("learning")}: ${label("learning", d.learning_curve)}`} />
        <Kpi label={t("horizon")} value={<span className="text-xl">{list("horizon", d.time_horizon)}</span>} hint={`${t("scale")}: ${list("toolscale", d.scale)}`} />
        <Kpi label={t("data")} value={label("data_intensity", d.data_intensity)} hint={`${t("os")}: ${list("os", d.os)}`} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <section className="grid gap-6 md:grid-cols-2">
            <div><h2 className="font-display text-xl font-semibold">{t("strengths")}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.strengths || t("notRecorded")}</p></div>
            <div><h2 className="font-display text-xl font-semibold">{t("weaknesses")}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.weaknesses || t("notRecorded")}</p></div>
          </section>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Fact k={t("bestFor")} v={list("bestfor", d.best_for)} />
            <Fact k={t("typicalResults")} v={d.typical_results || t("notRecorded")} />
            <Fact k={t("cost")} v={d.cost_usd ? `${d.cost_usd} USD` : t("notRecorded")} />
            <Fact k={t("dependency")} v={d.proprietary_dependency || c("none")} />
            <Fact k={t("support")} v={[d.training_available === "yes" && t("training"), d.helpdesk === "yes" && t("helpdesk"), d.community === "yes" && t("community")].filter(Boolean).join(" · ") || t("notRecorded")} />
            <Fact k={t("docs")} v={label("quality", d.doc_quality)} />
            <Fact k={t("cooking")} v={label("yesno", d.clean_cooking_capable)} />
            <Fact k={t("financing")} v={label("financing", d.financing_modelling)} />
            <Fact k={t("origin")} v={d.origin_country || t("notRecorded")} />
          </section>
          <Section title={t("usageTitle")} lede={t("usageLede")} className="mt-0">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="text-sm font-semibold">{t("byYear")}</p>
                <YearBars rows={d.by_year} stacked height={200} labels={{ studies: c("studies"), full: c("full"), light: c("light") }} />
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
                <p className="px-1 text-sm font-semibold">{t("whereUsed")}</p>
                <AfricaMap data={d.countries.map((x) => ({ iso3: x.iso3, value: x.studies, label: x.name, href: `/observatory/countries/${x.iso2}` }))} legend={{ low: "0", high: String(d.countries[0]?.studies ?? 1) }} />
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div><p className="text-sm font-semibold">{t("whoUses")}</p><div className="mt-2"><OriginBar origin={d.origin} labels={{ african_led: label("origin", "african_led"), mixed: label("origin", "mixed"), non_african: label("origin", "non_african") }} /></div></div>
              <div><p className="text-sm font-semibold">{t("coUsed")}</p>{d.co_used.length ? <RowBars className="mt-2" rows={d.co_used.map((x) => ({ label: x.tool, value: x.studies, href: `/observatory/tools/${encodeURIComponent(x.tool)}` }))} /> : <p className="mt-2 text-sm text-muted-foreground">{t("noCoUsed")}</p>}{d.often_linked && <p className="mt-2 text-xs text-muted-foreground">{t("oftenLinked")}: {d.often_linked}</p>}</div>
            </div>
          </Section>
          <Section title={t("studiesTitle", { n: d.studies.length })} className="mt-0">
            <div className="space-y-3">{d.studies.slice(0, 50).map((s) => <StudyCard key={s.study_id} s={s} />)}</div>
            {d.studies.length > 50 && <Button variant="outline" className="mt-4" asChild><Link href={`/observatory/studies?tool=${encodeURIComponent(d.tool_name)}`}>{t("allStudies", { n: d.studies.length })}</Link></Button>}
          </Section>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("trackerTitle")}</p>
            {m ? (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-muted px-2 py-1.5"><Star className="inline size-3" /> {m.stars?.toLocaleString()} <span className="text-xs text-muted-foreground">{t("stars")}</span></div>
                  <div className="rounded-md bg-muted px-2 py-1.5"><GitBranch className="inline size-3" /> {m.forks?.toLocaleString()} <span className="text-xs text-muted-foreground">{t("forks")}</span></div>
                  <div className="rounded-md bg-muted px-2 py-1.5">{m.open_issues} <span className="text-xs text-muted-foreground">{t("issues")}</span></div>
                  <div className="rounded-md bg-muted px-2 py-1.5">{m.contributors ?? "–"} <span className="text-xs text-muted-foreground">{t("contributors")}</span></div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("lastCommit")}: {formatDate(m.last_commit_at, locale)} · {m.repo_license || "–"} · {m.language || "–"}{m.archived ? ` · ${t("archived")}` : ""}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t("fetched")}: {formatDate(m.fetched_at, locale)}</p>
              </>
            ) : <p className="mt-2 text-sm text-muted-foreground">{d.repo_url ? t("noMetricsYet") : t("noRepo")}</p>}
            {d.tracker_url && <a href={d.tracker_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary underline">{t("trackerEntry")}</a>}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("sources")}</p>
            {src.length ? <ul className="mt-2 space-y-1 text-sm">{src.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.label}</a></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">{t("sourcesInventory", { n: d.n_studies })}</p>}
            {d.info_date && <p className="mt-2 text-xs text-muted-foreground">{t("checked")}: {d.info_date}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
