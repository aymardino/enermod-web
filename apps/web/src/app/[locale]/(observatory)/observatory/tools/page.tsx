"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Download, GitBranch, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, type ToolRow } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Sparkline } from "@/components/observatory/charts";
import { ChipGroup } from "@/components/observatory/filters";
import { Callout, Kpi } from "@/components/observatory/kpi";
import { PageHead } from "@/components/observatory/page-head";

type Sort = "n_studies" | "recent" | "views" | "stars" | "name";

export default function ToolsPage() {
  const t = useTranslations("observatory.tools");
  const c = useTranslations("common");
  const label = useLabel();
  const [q, setQ] = useState("");
  const [lics, setLics] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("n_studies");
  const { data } = useQuery<{ items: ToolRow[]; n_tools: number; n_used: number }>({ queryKey: ["tools"], queryFn: () => api.get("/tools") });
  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .filter((x) => !q || `${x.tool_name} ${x.full_name} ${x.best_for}`.toLowerCase().includes(q.toLowerCase()))
      .filter((x) => !lics.length || lics.includes(x.license))
      .filter((x) => !types.length || types.includes(x.type))
      .sort((a, b) => sort === "name" ? a.tool_name.localeCompare(b.tool_name) : sort === "recent" ? b.recent - a.recent : sort === "views" ? b.views_30d - a.views_30d
        : sort === "stars" ? (b.metrics?.stars ?? -1) - (a.metrics?.stars ?? -1) : b.n_studies - a.n_studies);
  }, [data, q, lics, types, sort]);
  const licences = Array.from(new Set((data?.items ?? []).map((x) => x.license).filter(Boolean)));
  const typesAll = Array.from(new Set((data?.items ?? []).map((x) => x.type).filter(Boolean)));
  const open = (data?.items ?? []).filter((x) => x.license === "open_source").length;
  const tracked = (data?.items ?? []).filter((x) => x.metrics).length;
  const popular = [...(data?.items ?? [])].sort((a, b) => b.views_30d - a.views_30d).filter((x) => x.views_30d > 0).slice(0, 5);
  return (
    <div className="mx-auto w-full max-w-[1248px] px-8 pb-[72px] max-md:px-4 2xl:max-w-[1400px]">
      <PageHead section="tools" title={t("title")} lede={t("lede")}>
        <Button variant="outline" className="mt-7 border-white bg-white text-brand-800 hover:bg-brand-50" asChild><a href={api.url("/export/tools.csv")} onClick={() => track("download", "tools.csv")}><Download />{t("download")}</a></Button>
      </PageHead>
      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label={t("inventory")} value={data.n_tools} hint={t("inventoryHint", { n: data.n_used })} tone="brand" />
          <Kpi label={t("openTools")} value={open} hint={t("openToolsHint")} />
          <Kpi label={t("tracked")} value={tracked} hint={t("trackedHint")} />
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("popular")}</p>
            {popular.length ? <ul className="mt-1 text-sm">{popular.map((x) => <li key={x.tool_name} className="flex justify-between"><Link href={`/observatory/tools/${encodeURIComponent(x.tool_name)}`} className="hover:text-primary">{x.tool_name}</Link><span className="tabular text-muted-foreground">{x.views_30d}</span></li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">{t("popularEmpty")}</p>}
          </div>
        </div>
      )}
      <Callout tone="brand" className="mt-6">{t("trackerNote")} <a href="https://openmod-tracker.org" target="_blank" rel="noreferrer" className="underline">openmod tracker</a>.</Callout>
      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card lg:grid-cols-[1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2">
          <ChipGroup label={t("licence")} value={lics} onChange={setLics} options={licences.map((x) => ({ value: x, label: label("license", x) }))} />
          <ChipGroup label={t("type")} value={types} onChange={setTypes} options={typesAll.map((x) => ({ value: x, label: label("type", x) }))} />
        </div>
        <div className="space-y-2">
          <Input placeholder={c("search")} value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 w-56 rounded-md border border-input bg-card px-3 text-sm">
            <option value="n_studies">{t("sort.studies")}</option><option value="recent">{t("sort.recent")}</option><option value="views">{t("sort.views")}</option><option value="stars">{t("sort.stars")}</option><option value="name">{t("sort.name")}</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        {!data ? <Skeleton className="h-96" /> : (
          <Table>
            <THead><TR><TH>{t("tool")}</TH><TH>{t("type")}</TH><TH>{t("licence")}</TH><TH>{t("programming")}</TH><TH className="text-right">{t("africaStudies")}</TH><TH>{t("trend")}</TH><TH>{t("repo")}</TH></TR></THead>
            <TBody>
              {rows.map((x) => (
                <TR key={x.tool_name}>
                  <TD><Link href={`/observatory/tools/${encodeURIComponent(x.tool_name)}`} className="font-medium hover:text-primary">{x.tool_name}</Link>{x.full_name && <span className="block max-w-[260px] truncate text-xs text-muted-foreground" title={x.full_name}>{x.full_name}</span>}</TD>
                  <TD className="text-muted-foreground">{label("type", x.type)}</TD>
                  <TD><Badge variant={x.license === "open_source" ? "brand" : x.license === "internal" ? "secondary" : "outline"}>{label("license", x.license)}</Badge>{x.free_for_developing === "yes" && x.license !== "open_source" && <span className="ml-1 text-[10px] text-muted-foreground">{t("freeLic")}</span>}</TD>
                  <TD className="text-muted-foreground">{label("programming", x.programming_required)}</TD>
                  <TD className="tabular text-right font-medium">{x.n_studies}</TD>
                  <TD><Sparkline values={x.sparkline} /><span className="block text-[10px] text-muted-foreground">{x.span[0]}–{x.span[1]}</span></TD>
                  <TD>{x.metrics ? <span className="inline-flex items-center gap-2 text-xs text-muted-foreground" title={x.metrics.fetched_at}><Star className="size-3" />{x.metrics.stars?.toLocaleString()}<GitBranch className="size-3" />{x.metrics.forks?.toLocaleString()}</span> : x.repo_url ? <a href={x.repo_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{t("repoLink")}</a> : <span className="text-xs text-muted-foreground">–</span>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("caption")}</p>
    </div>
  );
}
