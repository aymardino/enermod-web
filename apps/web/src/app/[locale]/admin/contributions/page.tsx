"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type Contribution } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUSES = ["pending", "approved", "rejected", "all"] as const;

export default function ContributionsPage() {
  const t = useTranslations("admin.contributions");
  const c = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery<Contribution[]>({ queryKey: ["admin-contributions", status], queryFn: () => api.get(`/admin/contributions?status=${status}`) });
  const detail = useQuery<Contribution>({ queryKey: ["admin-contribution", openId], queryFn: () => api.get(`/admin/contributions/${openId}`), enabled: !!openId });
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<string>("");
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : c("error"));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-contributions"] }); qc.invalidateQueries({ queryKey: ["admin-contribution", openId] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); };
  const approve = useMutation({ mutationFn: (id: string) => api.post(`/admin/contributions/${id}/approve`, { note }), onSuccess: () => { toast.success(t("approved")); refresh(); setOpenId(null); }, onError });
  const reject = useMutation({ mutationFn: (id: string) => api.post(`/admin/contributions/${id}/reject`, { note }), onSuccess: () => { toast.success(t("rejected")); refresh(); setOpenId(null); }, onError });
  const save = useMutation({ mutationFn: (id: string) => api.patch(`/admin/contributions/${id}`, { payload: JSON.parse(draft) }), onSuccess: () => { toast.success(c("saved")); refresh(); }, onError: (e) => toast.error(e instanceof SyntaxError ? t("badJson") : e instanceof ApiError ? e.message : c("error")) });
  const d = detail.data;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={t("title")} description={t("lede")} />
      <Tabs value={status} onValueChange={(v) => { setStatus(v as typeof status); setOpenId(null); }}>
        <TabsList>{STATUSES.map((s) => <TabsTrigger key={s} value={s}>{t(`status.${s}`)}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="mt-4 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-2">
          {list.isLoading && <Skeleton className="h-40" />}
          {list.data?.length === 0 && <EmptyState title={t("empty")} />}
          {list.data?.map((x) => (
            <button key={x.id} type="button" onClick={() => { setOpenId(x.id); setNote(""); setDraft(""); }} className={`block w-full rounded-xl border p-3 text-left text-sm shadow-card ${openId === x.id ? "border-brand-500 bg-brand-50 dark:bg-brand-950" : "border-border bg-card hover:border-brand-400"}`}>
              <div className="flex items-center gap-2"><Badge variant="secondary">{t(`kind.${x.kind}`)}</Badge><Badge variant="outline">{x.source}</Badge>{x.match_study_id && <Badge variant="outline">{t("possibleDuplicate")} #{x.match_study_id}</Badge>}</div>
              <p className="mt-2 font-medium leading-snug">{x.title || t(`kind.${x.kind}`)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{x.submitter_name || t("anonymous")}{x.submitter_org ? ` · ${x.submitter_org}` : ""} · {formatDate(x.created_at, locale)}</p>
            </button>
          ))}
        </div>
        <div>
          {!openId && <EmptyState title={t("pick")} />}
          {openId && !d && <Skeleton className="h-64" />}
          {d && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{t(`kind.${d.kind}`)}</Badge><Badge variant="outline">{d.source}</Badge><Badge variant={d.status === "pending" ? "outline" : "brand"}>{t(`status.${d.status as "pending"}`)}</Badge></div>
                  <h2 className="mt-2 font-display text-xl font-semibold">{d.title || t(`kind.${d.kind}`)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{d.submitter_name || t("anonymous")} {d.submitter_email && <a className="text-primary underline" href={`mailto:${d.submitter_email}`}>{d.submitter_email}</a>} {d.submitter_org && `· ${d.submitter_org}`} · {formatDate(d.created_at, locale)}</p>
                </div>
                {d.created_study_id && <Button variant="outline" size="sm" asChild><Link href={`/observatory/studies/${d.created_study_id}`}>{t("openStudy")} #{d.created_study_id}</Link></Button>}
              </div>
              {d.match_study_id && <p className="mt-3 rounded-md bg-amber-100/60 px-3 py-2 text-sm text-amber-700">{t("duplicateNote", { note: d.match_note })} <Link href={`/observatory/studies/${d.match_study_id}`} className="underline">#{d.match_study_id}</Link></p>}
              {d.target_study_id && <p className="mt-3 text-sm">{t("target")}: <Link href={`/observatory/studies/${d.target_study_id}`} className="text-primary underline">#{d.target_study_id}</Link></p>}
              {d.target_tool_name && <p className="mt-3 text-sm">{t("target")}: <Link href={`/observatory/tools/${encodeURIComponent(d.target_tool_name)}`} className="text-primary underline">{d.target_tool_name}</Link></p>}
              {d.message && <blockquote className="mt-3 border-l-4 border-brand-300 bg-brand-50 px-4 py-2 text-sm dark:bg-brand-950">{d.message}</blockquote>}
              {d.errors && d.errors.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-coral-700">{d.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
              {d.kind !== "correction" && (
                <div className="mt-4">
                  <p className="text-sm font-semibold">{t("payload")}</p>
                  <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    {Object.entries(d.payload ?? {}).filter(([, v]) => v !== "" && v !== null && !(Array.isArray(v) && !v.length)).map(([k, v]) => <div key={k} className="rounded-md bg-muted px-2 py-1"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words">{Array.isArray(v) ? v.join(", ") : String(v)}</dd></div>)}
                  </dl>
                  {d.status === "pending" && (
                    <details className="mt-3 text-sm"><summary className="cursor-pointer text-primary">{t("editJson")}</summary>
                      <Textarea className="mt-2 font-mono text-xs" rows={10} value={draft || JSON.stringify(d.payload, null, 2)} onChange={(e) => setDraft(e.target.value)} />
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => save.mutate(d.id)} disabled={!draft}>{c("save")}</Button>
                    </details>
                  )}
                </div>
              )}
              {d.status === "pending" ? (
                <div className="mt-5 border-t border-border pt-4">
                  <Textarea placeholder={t("notePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => approve.mutate(d.id)} disabled={approve.isPending || (d.errors?.length ?? 0) > 0}><Check />{t("approve")}</Button>
                    <Button variant="outline" onClick={() => reject.mutate(d.id)} disabled={reject.isPending}><X />{t("reject")}</Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{d.kind === "study" ? t("approveHint") : d.kind === "tool" ? t("approveToolHint") : t("approveCorrectionHint")}</p>
                </div>
              ) : <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">{t("reviewed", { d: formatDate(d.reviewed_at, locale) })}{d.review_note ? ` · ${d.review_note}` : ""}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
