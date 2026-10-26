"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Download, Play, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type Candidate, type Job } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AdminPage, JobStatus } from "@/components/admin/admin-shell";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldHint, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { NativeSelect } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Block } from "@/components/observatory/page-head";
import { SldStep, SldSteps } from "@/components/marketing/single-line-diagram";

type Run = { id: string; mode: string; since_date: string; status: string; n_fetched: number; n_new: number; n_known: number; n_queries: number; error: string; started_at: string; finished_at: string | null };
const STATUSES = ["new", "relevant", "irrelevant", "imported", "known"] as const;

export default function DiscoveryPage() {
  const t = useTranslations("admin.discovery");
  const c = useTranslations("common");
  const locale = useLocale();
  const format = useFormatter();
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("new");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  // screening score: hide the weak candidates by default, best score first
  const [minRelevance, setMinRelevance] = useState<"all" | "possible" | "strong">("possible");
  const [sort, setSort] = useState<"relevance" | "recent">("relevance");
  const [since, setSince] = useState("");
  const runs = useQuery<Run[]>({ queryKey: ["discovery-runs"], queryFn: () => api.get("/admin/discovery/runs"), refetchInterval: 10_000 });
  // whether the server holds an OpenAlex API key; without one every run is refused
  const setup = useQuery<{ queries: string[]; api_key: boolean }>({ queryKey: ["discovery-setup"], queryFn: () => api.get("/admin/discovery/queries"), staleTime: 600_000 });
  type CandidatePage = { items: Candidate[]; total: number; weak: number; thresholds: { possible: number; strong: number } };
  const cands = useQuery<CandidatePage>({
    queryKey: ["candidates", status, q, page, minRelevance, sort],
    queryFn: () => api.get(`/admin/discovery/candidates?status=${status}&q=${encodeURIComponent(q)}&page=${page}&page_size=30&sort=${sort}${minRelevance === "all" ? "" : `&min_relevance=${minRelevance === "strong" ? 5 : 2}`}`),
  });
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : c("error"));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["candidates"] }); qc.invalidateQueries({ queryKey: ["discovery-runs"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); };
  const run = useMutation({ mutationFn: (mode: "since" | "full") => api.post<Job>("/admin/discovery/run", { mode, since: since || null }), onSuccess: (j) => { toast.success(j.status === "done" ? t("runDone", { n: Number(j.result.new ?? 0) }) : t("runQueued")); refresh(); }, onError });
  const mark = useMutation({ mutationFn: ({ id, s }: { id: number; s: string }) => api.patch(`/admin/discovery/candidates/${id}`, { status: s }), onSuccess: refresh, onError });
  const toContribution = useMutation({ mutationFn: (id: number) => api.post(`/admin/discovery/candidates/${id}/to-contribution`), onSuccess: () => { toast.success(t("sentToContributions")); refresh(); }, onError });
  const dismissWeak = useMutation({
    mutationFn: (max: number) => api.post<{ count: number }>("/admin/discovery/candidates/dismiss-weak", { max_relevance: max }),
    onSuccess: (r) => { toast.success(t("dismissed", { n: r.count })); refresh(); },
    onError,
  });
  const pages = cands.data ? Math.max(1, Math.ceil(cands.data.total / 30)) : 1;

  return (
    <AdminPage>
      <PageHeader
        title={t("title")}
        description={t("lede")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={api.url("/admin/discovery/export.ris?status=new&min_relevance=5")}>
                <Download aria-hidden="true" strokeWidth={1.5} />
                {t("exportNew")}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={api.url("/admin/discovery/export.ris?status=relevant")}>
                <Download aria-hidden="true" strokeWidth={1.5} />
                {t("exportRis")}
              </a>
            </Button>
          </div>
        }
      />
      <div className="grid gap-x-12 gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="min-w-0">
          {/* run the pipeline: a ruled form row */}
          <Block title={t("runTitle")} titleAs="h2">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <Label htmlFor="discovery-since">{t("since")}</Label>
                <Input id="discovery-since" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
              </div>
              <Button onClick={() => run.mutate("since")} disabled={run.isPending}>
                <Play aria-hidden="true" strokeWidth={1.5} />
                {t("runSince")}
              </Button>
              <Button variant="outline" onClick={() => run.mutate("full")} disabled={run.isPending}>
                {t("runFull")}
              </Button>
            </div>
            <FieldHint className="mt-2.5 max-w-[60em]">{t("runHint")}</FieldHint>
          </Block>

          {/* screening */}
          <div className="mt-12 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <Tabs value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }} className="min-w-0 max-w-full flex-1">
              <TabsList>
                {STATUSES.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {t(`status.${s}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Input type="search" placeholder={c("search")} aria-label={c("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-64 max-sm:w-full" />
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="w-56 max-sm:w-full">
              <Label htmlFor="min-relevance">{t("relevance")}</Label>
              <NativeSelect id="min-relevance" value={minRelevance} onChange={(e) => { setMinRelevance(e.target.value as typeof minRelevance); setPage(1); }}>
                <option value="possible">{t("showPossible")}</option>
                <option value="strong">{t("showStrong")}</option>
                <option value="all">{t("showAll")}</option>
              </NativeSelect>
            </div>
            <div className="w-40 max-sm:w-full">
              <Label htmlFor="sort-candidates">{c("sort")}</Label>
              <NativeSelect id="sort-candidates" value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }}>
                <option value="relevance">{t("sortRelevance")}</option>
                <option value="recent">{t("sortRecent")}</option>
              </NativeSelect>
            </div>
            {status === "new" && (cands.data?.weak ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={dismissWeak.isPending}
                onClick={() => { if (window.confirm(t("dismissWeakConfirm", { n: cands.data!.weak }))) dismissWeak.mutate((cands.data!.thresholds.possible) - 1); }}
              >
                <X aria-hidden="true" strokeWidth={1.75} />
                {t("dismissWeak")}
              </Button>
            )}
          </div>
          <FieldHint className="mt-2 max-w-[60em]">{t("relevanceHint")}</FieldHint>
          <p className="mt-4 text-[13px] tabular-nums text-muted-foreground" aria-live="polite">
            {cands.data ? t("count", { n: cands.data.total }) : c("loading")}
            {cands.data && status === "new" && minRelevance !== "all" && cands.data.weak > 0 && <> · {t("weakHidden", { n: cands.data.weak })}</>}
          </p>

          <div className="mt-2">
            {cands.isLoading && <Skeleton className="h-40" />}
            {cands.data?.items.length === 0 && <EmptyState title={t("empty")} description={t("emptyHint")} />}
            {cands.data && cands.data.items.length > 0 && (
              <ol className="border-b-2 border-t-2 border-rule">
                {cands.data.items.map((x) => (
                  <li key={x.id} className="border-b border-border py-4 last:border-b-0">
                    <article className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{x.year ?? t("noDate")}</span>
                        {x.relevance !== null && (
                          <Tag variant={x.bucket === "strong" ? "solid" : x.bucket === "possible" ? undefined : "warn"} title={`${t("relevance")}: ${x.relevance}`}>
                            {t(`bucket.${x.bucket}`)} · {x.relevance}
                          </Tag>
                        )}
                        {x.work_type && <Tag>{x.work_type}</Tag>}
                        {x.venue && <span className="min-w-0 max-w-full truncate">{x.venue}</span>}
                        <span>· {t("cited", { n: x.cited_by })}</span>
                        {x.match_study_id && (
                          <Tag variant="warn">
                            {t("matches")}
                            <Link href={`/observatory/studies/${x.match_study_id}`} className="text-amber-700 underline decoration-1 underline-offset-2">
                              #{x.match_study_id}
                            </Link>
                            <span className="font-medium">({format.number((x.match_score ?? 0) / 100, { style: "percent", maximumFractionDigits: 0 })})</span>
                          </Tag>
                        )}
                      </p>
                      <h3 className="mt-2 font-display text-[18.5px] font-semibold leading-[1.28]">
                        {x.doi || x.url ? (
                          <a href={x.doi ? `https://doi.org/${x.doi}` : x.url} target="_blank" rel="noreferrer" className="no-underline decoration-link decoration-1 underline-offset-[3px] hover:underline">
                            {x.title}
                          </a>
                        ) : (
                          x.title
                        )}
                      </h3>
                      {x.authors && <p className="mt-1 line-clamp-2 font-display text-[14.5px] leading-[1.4] text-ink-2">{x.authors}</p>}
                      {(x.signals_in.length > 0 || x.signals_out.length > 0) && (
                        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] leading-[1.4]">
                          {x.signals_in.length > 0 && <span className="text-brand-800"><span className="font-semibold">{t("signalsIn")}</span> {x.signals_in.join(", ")}</span>}
                          {x.signals_out.length > 0 && <span className="text-coral-700"><span className="font-semibold">{t("signalsOut")}</span> {x.signals_out.join(", ")}</span>}
                        </p>
                      )}
                      {x.abstract && (
                        <details className="mt-2 text-sm">
                          <summary className="link inline-flex min-h-6 cursor-pointer items-center text-[13px]">{t("abstract")}</summary>
                          <p className="mt-1.5 max-w-[48em] font-display text-[15.5px] leading-[1.55] text-ink-2">{x.abstract}</p>
                        </details>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {status !== "relevant" && (
                          <Button size="sm" variant="outline" onClick={() => mark.mutate({ id: x.id, s: "relevant" })}>
                            <Check aria-hidden="true" strokeWidth={1.75} />
                            {t("markRelevant")}
                          </Button>
                        )}
                        {status !== "irrelevant" && (
                          <Button size="sm" variant="outline" onClick={() => mark.mutate({ id: x.id, s: "irrelevant" })}>
                            <X aria-hidden="true" strokeWidth={1.75} />
                            {t("markIrrelevant")}
                          </Button>
                        )}
                        {status !== "imported" && (
                          <Button size="sm" variant="ghost" onClick={() => toContribution.mutate(x.id)}>
                            {t("toContribution")}
                          </Button>
                        )}
                        {x.oa_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={x.oa_url} target="_blank" rel="noreferrer">
                              PDF
                            </a>
                          </Button>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {cands.data && cands.data.total > 30 && (
            <div className="mt-5 flex items-center justify-between gap-3 text-[13px]">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {c("previous")}
              </Button>
              <span className="tabular-nums text-muted-foreground">{t("pager", { page, pages })}</span>
              <Button variant="outline" size="sm" disabled={page * 30 >= cands.data.total} onClick={() => setPage(page + 1)}>
                {c("next")}
              </Button>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-12">
          <Block title={t("runs")}>
            {setup.data?.api_key === false && (
              <p role="alert" className="mb-4 border-l-2 border-amber-500 py-0.5 pl-3.5 text-[14px] leading-[1.5] text-ink-2">{t("noKey")}</p>
            )}
            <ul className="border-b-2 border-t border-rule">
              {runs.data?.length === 0 && <li className="not-assessed py-3 text-[15px]">{t("noRuns")}</li>}
              {runs.data?.slice(0, 10).map((r) => (
                <li key={r.id} className="border-b border-border py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-[14px] font-semibold">{r.mode === "full" ? t("runFull") : t("runSince")}</span>
                    <JobStatus status={r.status} />
                  </div>
                  <p className="mt-1 text-[12.5px] leading-[1.45] tabular-nums text-muted-foreground">
                    {formatDate(r.started_at, locale)} · {t("sinceLabel")} {r.since_date} · {t("fetched", { f: r.n_fetched, n: r.n_new, k: r.n_known })}
                  </p>
                  {r.error && <p className="mt-1 text-[12.5px] leading-[1.45] text-destructive [overflow-wrap:anywhere]">{r.error}</p>}
                </li>
              ))}
            </ul>
          </Block>
          <Block title={t("workflowTitle")}>
            <SldSteps ariaLabel={t("workflowTitle")} className="mt-1">
              {(["w1", "w2", "w3", "w4"] as const).map((k, i) => (
                <SldStep key={k}>
                  <p className="text-[14px] leading-[1.5] text-ink-2">
                    <span aria-hidden="true" className="mr-2 font-semibold tabular-nums text-rubric">{i + 1}</span>
                    {t(k)}
                  </p>
                </SldStep>
              ))}
            </SldSteps>
          </Block>
        </aside>
      </div>
    </AdminPage>
  );
}
