"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type Candidate, type Job } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Run = { id: string; mode: string; since_date: string; status: string; n_fetched: number; n_new: number; n_known: number; n_queries: number; error: string; started_at: string; finished_at: string | null };
const STATUSES = ["new", "relevant", "irrelevant", "imported", "known"] as const;

export default function DiscoveryPage() {
  const t = useTranslations("admin.discovery");
  const c = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("new");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [since, setSince] = useState("");
  const runs = useQuery<Run[]>({ queryKey: ["discovery-runs"], queryFn: () => api.get("/admin/discovery/runs"), refetchInterval: 10_000 });
  const cands = useQuery<{ items: Candidate[]; total: number }>({ queryKey: ["candidates", status, q, page], queryFn: () => api.get(`/admin/discovery/candidates?status=${status}&q=${encodeURIComponent(q)}&page=${page}&page_size=30`) });
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : c("error"));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["candidates"] }); qc.invalidateQueries({ queryKey: ["discovery-runs"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); };
  const run = useMutation({ mutationFn: (mode: "since" | "full") => api.post<Job>("/admin/discovery/run", { mode, since: since || null }), onSuccess: (j) => { toast.success(j.status === "done" ? t("runDone", { n: Number(j.result.new ?? 0) }) : t("runQueued")); refresh(); }, onError });
  const mark = useMutation({ mutationFn: ({ id, s }: { id: number; s: string }) => api.patch(`/admin/discovery/candidates/${id}`, { status: s }), onSuccess: refresh, onError });
  const toContribution = useMutation({ mutationFn: (id: number) => api.post(`/admin/discovery/candidates/${id}/to-contribution`), onSuccess: () => { toast.success(t("sentToContributions")); refresh(); }, onError });
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={t("title")} description={t("lede")} actions={<Button variant="outline" asChild><a href={api.url("/admin/discovery/export.ris?status=relevant")}><Download />{t("exportRis")}</a></Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("since")}</label><Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="w-44" /></div>
              <Button onClick={() => run.mutate("since")} disabled={run.isPending}><Play />{t("runSince")}</Button>
              <Button variant="outline" onClick={() => run.mutate("full")} disabled={run.isPending}>{t("runFull")}</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("runHint")}</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Tabs value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}><TabsList className="h-auto flex-wrap">{STATUSES.map((s) => <TabsTrigger key={s} value={s}>{t(`status.${s}`)}</TabsTrigger>)}</TabsList></Tabs>
            <Input placeholder={c("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-56" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{cands.data ? t("count", { n: cands.data.total }) : c("loading")}</p>
          <div className="mt-3 space-y-3">
            {cands.isLoading && <Skeleton className="h-40" />}
            {cands.data?.items.length === 0 && <EmptyState title={t("empty")} description={t("emptyHint")} />}
            {cands.data?.items.map((x) => (
              <article key={x.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-1.5 text-xs"><Badge variant="outline">{x.year ?? "n.d."}</Badge>{x.work_type && <Badge variant="secondary">{x.work_type}</Badge>}{x.venue && <span className="text-muted-foreground">{x.venue}</span>}<span className="text-muted-foreground">· {t("cited", { n: x.cited_by })}</span>{x.match_study_id && <Badge variant="outline">{t("matches")} <Link href={`/observatory/studies/${x.match_study_id}`} className="ml-1 underline">#{x.match_study_id}</Link> ({Math.round(x.match_score ?? 0)}%)</Badge>}</div>
                <h3 className="mt-2 font-medium leading-snug">{x.doi || x.url ? <a href={x.doi ? `https://doi.org/${x.doi}` : x.url} target="_blank" rel="noreferrer" className="hover:text-primary">{x.title}</a> : x.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{x.authors}</p>
                {x.abstract && <details className="mt-2 text-sm"><summary className="cursor-pointer text-primary">{t("abstract")}</summary><p className="mt-1 text-muted-foreground">{x.abstract}</p></details>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {status !== "relevant" && <Button size="sm" onClick={() => mark.mutate({ id: x.id, s: "relevant" })}>{t("markRelevant")}</Button>}
                  {status !== "irrelevant" && <Button size="sm" variant="outline" onClick={() => mark.mutate({ id: x.id, s: "irrelevant" })}>{t("markIrrelevant")}</Button>}
                  {status !== "imported" && <Button size="sm" variant="ghost" onClick={() => toContribution.mutate(x.id)}>{t("toContribution")}</Button>}
                  {x.oa_url && <Button size="sm" variant="ghost" asChild><a href={x.oa_url} target="_blank" rel="noreferrer">PDF</a></Button>}
                </div>
              </article>
            ))}
          </div>
          {cands.data && cands.data.total > 30 && (
            <div className="mt-4 flex items-center justify-between text-sm"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{c("previous")}</Button><span className="text-muted-foreground">{c("page")} {page}</span><Button variant="outline" size="sm" disabled={page * 30 >= cands.data.total} onClick={() => setPage(page + 1)}>{c("next")}</Button></div>
          )}
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <h2 className="font-semibold">{t("runs")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {runs.data?.length === 0 && <li className="text-muted-foreground">{t("noRuns")}</li>}
              {runs.data?.slice(0, 10).map((r) => (
                <li key={r.id} className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between"><span className="font-medium">{r.mode === "full" ? t("runFull") : t("runSince")}</span><Badge variant={r.status === "done" ? "brand" : r.status === "failed" ? "secondary" : "outline"}>{r.status}</Badge></div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.started_at, locale)} · {t("sinceLabel")} {r.since_date} · {t("fetched", { f: r.n_fetched, n: r.n_new, k: r.n_known })}</p>
                  {r.error && <p className="mt-1 text-xs text-coral-700">{r.error}</p>}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-card">
            <h2 className="font-semibold">{t("workflowTitle")}</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground"><li>{t("w1")}</li><li>{t("w2")}</li><li>{t("w3")}</li><li>{t("w4")}</li></ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
