"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Flag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type Study } from "@/lib/api";
import { useLabel, useListLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { PageHead } from "@/components/observatory/page-head";

const TECH = ["solar", "wind", "hydro", "biomass", "nuclear", "geothermal", "fossil", "h2", "coal"];
const FEATURES = ["informal_economy", "biomass_charcoal", "clean_cooking", "power_reliability", "urbanization"];

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="grid gap-1 border-b border-border/60 py-2 sm:grid-cols-[200px_1fr]"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-sm">{v}</dd></div>;
}

export default function StudyPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("observatory.study");
  const nav = useTranslations("nav");
  const c = useTranslations("common");
  const label = useLabel();
  const list = useListLabel();
  const { data: s, error, isLoading } = useQuery<Study>({ queryKey: ["study", id], queryFn: () => api.get(`/studies/${id}`), retry: false });
  useEffect(() => { if (s) track("study_view", String(s.study_id)); }, [s]);
  if (isLoading) return <div className="mx-auto max-w-5xl px-4 py-8"><Skeleton className="h-10 w-2/3" /><Skeleton className="mt-6 h-64" /></div>;
  if (error || !s) return <div className="mx-auto max-w-5xl px-4 py-8"><EmptyState title={error instanceof ApiError && error.status === 404 ? t("notFound") : c("error")} action={<Button asChild><Link href="/observatory/studies">{t("back")}</Link></Button>} /></div>;
  const str = (k: string) => (s[k] as string | null | undefined) ?? "";
  const na = <span className="text-muted-foreground">{t("notExtracted")}</span>;
  const show = (k: string) => (str(k) ? str(k) : na);
  const techs = TECH.filter((k) => str(k).toLowerCase() === "yes");
  const policy = [["sdg_7", "SDG 7"], ["sdg_13", "SDG 13"], ["ndc_mention", "NDC"], ["agenda_2063", "Agenda 2063"]].filter(([k]) => str(k).toLowerCase() === "yes").map(([, l]) => l);
  return (
    <div className="mx-auto w-full max-w-[1248px] px-8 pb-[72px] max-md:px-4">
      <PageHead
        crumbs={[{ label: nav("observatory"), href: "/observatory" }, { label: nav("obs.studies"), href: "/observatory/studies" }, { label: `#${s.study_id}` }]}
        title={s.full_title || s.model_name}
        lede={[s.authors, s.year, s.model_name].filter(Boolean).join(" · ")}
      >
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white">{label("level", s.level)}</span>
          {s.scale && <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white">{label("scale", s.scale)}</span>}
          {s.open_source && <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white">{label("open_source", s.open_source)}</span>}
          {s.grey_literature === "yes" && <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white">{label("grey", "yes")}</span>}
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white">{label("source", s.source)}</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {s.link && <Button size="sm" className="bg-white text-brand-800 hover:bg-brand-50" asChild><a href={s.link} target="_blank" rel="noreferrer"><ExternalLink />{t("openSource")}</a></Button>}
          <Button variant="outline" size="sm" className="border-white/70 bg-transparent text-white hover:bg-white/10" asChild><Link href={`/contribute?kind=correction&study=${s.study_id}`}><Flag />{t("suggest")}</Link></Button>
        </div>
      </PageHead>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-8">
          <section><h2 className="font-display text-xl font-semibold">{t("objective")}</h2><p className="mt-2 leading-relaxed">{show("study_objective")}</p></section>
          <section><h2 className="font-display text-xl font-semibold">{t("keyResult")}</h2><p className="mt-2 leading-relaxed">{show("key_result")}</p></section>
          <div className="grid gap-6 md:grid-cols-2">
            <section><h3 className="font-semibold">{t("strengths")}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{show("strengths")}</p></section>
            <section><h3 className="font-semibold">{t("weaknesses")}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{show("weaknesses")}</p></section>
          </div>
          <section>
            <h2 className="font-display text-xl font-semibold">{t("record")}</h2>
            <dl className="mt-2">
              <Row k={t("category")} v={list("category", str("study_category"))} />
              <Row k={t("sector")} v={list("sector", str("sector"))} />
              <Row k={t("approach")} v={label("approach", str("approach"))} />
              <Row k={t("method")} v={list("method", str("method"))} />
              <Row k={t("math")} v={list("math", str("mathematical_approach"))} />
              <Row k={t("horizon")} v={str("time_horizon_start") || str("time_horizon_end") ? `${str("time_horizon_start") || "?"} → ${str("time_horizon_end") || "?"}` : na} />
              <Row k={t("technologies")} v={techs.length ? techs.map((k) => label("tech", k)).join(", ") : na} />
              <Row k={t("features")} v={<ul className="flex flex-wrap gap-1.5">{FEATURES.map((k) => <li key={k}><Badge variant={str(k).toLowerCase() === "yes" ? "brand" : str(k).toLowerCase() === "partial" ? "secondary" : "outline"}>{label("feature", k)}: {label("yesno", str(k))}</Badge></li>)}</ul>} />
              <Row k={t("policy")} v={policy.length ? policy.join(", ") : <span className="text-muted-foreground">{t("noneRecorded")}</span>} />
              <Row k={t("theme")} v={list("theme", str("aisesa_theme"))} />
              <Row k={t("coc")} v={show("cost_of_capital")} />
              <Row k={t("financing")} v={`${label("yesno", str("financing_modelling"))}${str("financing_mechanism") ? ` · ${str("financing_mechanism")}` : ""}`} />
              <Row k={t("affiliation")} v={show("authors_affiliation")} />
              <Row k={t("origin")} v={<>{label("origin", s.local_ownership === "yes" ? "african_led" : s.local_ownership === "partial" ? "mixed" : s.local_ownership === "no" ? "non_african" : "")}{str("author_origin") ? <span className="text-muted-foreground"> · {str("author_origin")}</span> : null}</>} />
              <Row k={t("users")} v={show("institutional_users")} />
              <Row k={t("contact")} v={show("contact")} />
            </dl>
          </section>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("tools")}</p>
            <ul className="mt-2 space-y-1.5">
              {s.tool_profiles.map((tp) => <li key={tp.tool_name}><Link href={`/observatory/tools/${encodeURIComponent(tp.tool_name)}`} className="font-medium hover:text-primary">{tp.tool_name}</Link><span className="block text-xs text-muted-foreground">{label("license", tp.license)} · {label("type", tp.type)}</span></li>)}
              {s.tool_profiles.length === 0 && <li className="text-sm text-muted-foreground">{t("noTool")}</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("countries")} ({s.countries.length})</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {s.countries.map((iso, i) => <li key={iso}><Link href={`/observatory/countries/${iso}`} className="rounded-md border border-border px-2 py-0.5 text-xs hover:border-brand-400" title={s.country_names[i]}>{s.country_names[i] ?? iso}</Link></li>)}
            </ul>
            {s.pools.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{t("pools")}: {s.pools.join(", ")}</p>}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-card">
            <p>{t("provenance")}</p>
            <p className="mt-2"><Link href="/methodology" className="text-primary underline">{t("methodLink")}</Link></p>
          </div>
        </aside>
      </div>
    </div>
  );
}
