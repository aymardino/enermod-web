"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type Contribution } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { AdminPage } from "@/components/admin/admin-shell";
import { StatusTag, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Callout } from "@/components/observatory/kpi";

const STATUSES = ["pending", "approved", "rejected", "all"] as const;

export default function ContributionsPage() {
  const t = useTranslations("admin.contributions");
  const c = useTranslations("common");
  const locale = useLocale();
  /** French sets a narrow no-break space before the colon */
  const colon = locale === "fr" ? "\u202f:" : ":";
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery<Contribution[]>({ queryKey: ["admin-contributions", status], queryFn: () => api.get(`/admin/contributions?status=${status}`) });
  const detail = useQuery<Contribution>({ queryKey: ["admin-contribution", openId], queryFn: () => api.get(`/admin/contributions/${openId}`), enabled: !!openId });
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<string>("");
  // the essentials a study needs before it can be published, edited without touching the JSON
  const [ess, setEss] = useState<{ tools: string; countries: string; extraction_level: string; scale: string } | null>(null);
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : c("error"));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-contributions"] }); qc.invalidateQueries({ queryKey: ["admin-contribution", openId] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); };
  const approve = useMutation({ mutationFn: (id: string) => api.post(`/admin/contributions/${id}/approve`, { note }), onSuccess: () => { toast.success(t("approved")); refresh(); setOpenId(null); }, onError });
  const reject = useMutation({ mutationFn: (id: string) => api.post(`/admin/contributions/${id}/reject`, { note }), onSuccess: () => { toast.success(t("rejected")); refresh(); setOpenId(null); }, onError });
  const save = useMutation({ mutationFn: (id: string) => api.patch(`/admin/contributions/${id}`, { payload: JSON.parse(draft) }), onSuccess: () => { toast.success(c("saved")); refresh(); }, onError: (e) => toast.error(e instanceof SyntaxError ? t("badJson") : e instanceof ApiError ? e.message : c("error")) });
  const saveEssentials = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/contributions/${id}`, { payload: ess }),
    onSuccess: () => { toast.success(c("saved")); setEss(null); refresh(); },
    onError,
  });
  const d = detail.data;
  const missing = d?.completeness?.missing ?? [];
  const asText = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));
  const essentialsFrom = (payload: Record<string, unknown>) => ({
    tools: asText(payload.tools), countries: asText(payload.countries), extraction_level: asText(payload.extraction_level), scale: asText(payload.scale),
  });

  const kind = (k: string) => (t.has(`kind.${k}`) ? t(`kind.${k}`) : k);
  const source = (s: string) => (t.has(`source.${s}`) ? t(`source.${s}`) : s);
  const state = (s: string) => (t.has(`state.${s}`) ? t(`state.${s}`) : s);
  const fields = Object.entries(d?.payload ?? {}).filter(([, v]) => v !== "" && v !== null && !(Array.isArray(v) && !v.length));

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("lede")} />
      <Tabs value={status} onValueChange={(v) => { setStatus(v as typeof status); setOpenId(null); }}>
        <TabsList>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {t(`status.${s}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* the queue: a ruled ledger, one row per proposal */}
        <div className="min-w-0">
          {list.isLoading && <Skeleton className="h-40" />}
          {list.data?.length === 0 && <EmptyState title={t("empty")} />}
          {list.data && list.data.length > 0 && (
            <ul className="border-b-2 border-t-2 border-rule">
              {list.data.map((x) => {
                const selected = openId === x.id;
                return (
                  <li key={x.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => { setOpenId(x.id); setNote(""); setDraft(""); }}
                      className={cn(
                        "relative block w-full py-3.5 pl-3.5 pr-3 text-left text-sm focus-visible:outline-offset-[-2px]",
                        "before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
                        selected ? "bg-accent before:bg-foreground" : "hover:bg-sand-100 before:bg-transparent",
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Tag>{kind(x.kind)}</Tag>
                        <Tag variant="plain" className="text-muted-foreground">{source(x.source)}</Tag>
                        {status === "all" && <StatusTag status={x.status}>{state(x.status)}</StatusTag>}
                        {x.match_study_id && (
                          <Tag variant="warn">
                            {t("possibleDuplicate")} #{x.match_study_id}
                          </Tag>
                        )}
                      </span>
                      <span className="mt-2 block font-display text-[17px] font-semibold leading-[1.28] text-foreground">{x.title || kind(x.kind)}</span>
                      <span className="mt-1 block text-[12.5px] leading-[1.4] text-muted-foreground">
                        {x.submitter_name || t("anonymous")}
                        {x.submitter_org ? ` · ${x.submitter_org}` : ""} · <span className="tabular-nums">{formatDate(x.created_at, locale)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* the detail pane: ruled, no box */}
        <div className="min-w-0">
          {!openId && (
            <div className="border-t-2 border-rule pt-4">
              <p className="not-assessed text-[15.5px]">{t("pick")}</p>
            </div>
          )}
          {openId && !d && <Skeleton className="h-64" />}
          {d && (
            <article className="border-t-2 border-rule pt-4" aria-labelledby="contribution-title">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Tag>{kind(d.kind)}</Tag>
                    <Tag variant="plain" className="text-muted-foreground">{source(d.source)}</Tag>
                    <StatusTag status={d.status}>{state(d.status)}</StatusTag>
                  </div>
                  <h2 id="contribution-title" className="mt-3 text-balance font-display text-[26px] font-semibold leading-[1.18] tracking-[-0.01em]">
                    {d.title || kind(d.kind)}
                  </h2>
                  <p className="mt-2 text-[13.5px] text-muted-foreground">
                    {d.submitter_name || t("anonymous")}
                    {d.submitter_email && (
                      <>
                        {" · "}
                        <a className="link text-foreground" href={`mailto:${d.submitter_email}`}>
                          {d.submitter_email}
                        </a>
                      </>
                    )}
                    {d.submitter_org && ` · ${d.submitter_org}`} · <span className="tabular-nums">{formatDate(d.created_at, locale)}</span>
                  </p>
                </div>
                {d.created_study_id && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/observatory/studies/${d.created_study_id}`}>
                      {t("openStudy")} #{d.created_study_id}
                    </Link>
                  </Button>
                )}
              </div>

              {(d.match_study_id || d.target_study_id || d.target_tool_name) && (
                <div className="mt-5 space-y-3">
                  {d.match_study_id && (
                    <Callout tone="amber">
                      {t("duplicateNote", { note: d.match_note })} <Link href={`/observatory/studies/${d.match_study_id}`}>#{d.match_study_id}</Link>
                    </Callout>
                  )}
                  {d.target_study_id && (
                    <p className="text-[14px]">
                      <span className="text-muted-foreground">{t("target")}{colon}</span>{" "}
                      <Link href={`/observatory/studies/${d.target_study_id}`} className="link">
                        #{d.target_study_id}
                      </Link>
                    </p>
                  )}
                  {d.target_tool_name && (
                    <p className="text-[14px]">
                      <span className="text-muted-foreground">{t("target")}{colon}</span>{" "}
                      <Link href={`/observatory/tools/${encodeURIComponent(d.target_tool_name)}`} className="link">
                        {d.target_tool_name}
                      </Link>
                    </p>
                  )}
                </div>
              )}

              {d.message && (
                <figure className="mt-6">
                  <figcaption className="sc text-muted-foreground">{t("message")}</figcaption>
                  <blockquote className="mt-2 whitespace-pre-line border-l-2 border-rubric pl-4 font-display text-[16px] leading-[1.5] text-ink-2">{d.message}</blockquote>
                </figure>
              )}

              {d.errors && d.errors.length > 0 && (
                <div className="mt-6 border-l-2 border-destructive pl-4" role="note">
                  <p className="sc text-destructive">{t("errors")}</p>
                  <ul className="mt-1.5 space-y-1 text-[13.5px] leading-[1.45] text-destructive">
                    {d.errors.map((e) => (
                      <li key={e} className="flex gap-2">
                        <X aria-hidden="true" strokeWidth={1.75} className="mt-[3px] size-3.5 shrink-0" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.kind === "study" && d.status === "pending" && missing.length > 0 && (
                <div className="mt-6 border-l-2 border-destructive pl-4" role="note">
                  <p className="sc text-destructive">{t("missing")}</p>
                  <p className="mt-1.5 max-w-[48em] text-[13.5px] leading-[1.45] text-destructive">{t("missingText")}</p>
                  <ul className="mt-1.5 space-y-1 text-[13.5px] leading-[1.45] text-destructive">
                    {missing.map((m) => (
                      <li key={m} className="flex gap-2">
                        <X aria-hidden="true" strokeWidth={1.75} className="mt-[3px] size-3.5 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.kind === "study" && d.status === "pending" && d.source === "discovery" && (
                <Callout tone="brand" className="mt-6 max-w-[52em]">{t("discoveryHint")}</Callout>
              )}

              {d.kind === "study" && d.status === "pending" && (
                <section className="mt-8">
                  <h3 className="font-display text-[19px] font-semibold leading-[1.25]">{t("essentials")}</h3>
                  {(() => {
                    const form = ess ?? essentialsFrom((d.payload ?? {}) as Record<string, unknown>);
                    const set = (k: keyof typeof form, v: string) => setEss({ ...form, [k]: v });
                    return (
                      <div className="mt-3 grid max-w-[52em] gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Label htmlFor="ess-tools">{t("f.tools")}</Label>
                          <Input id="ess-tools" value={form.tools} onChange={(e) => set("tools", e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="ess-countries">{t("f.countries")}</Label>
                          <Input id="ess-countries" value={form.countries} onChange={(e) => set("countries", e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="ess-level">{t("f.level")}</Label>
                          <NativeSelect id="ess-level" value={form.extraction_level} onChange={(e) => set("extraction_level", e.target.value)}>
                            <option value="">{t("unset")}</option>
                            <option value="full">{t("level.full")}</option>
                            <option value="light">{t("level.light")}</option>
                          </NativeSelect>
                        </div>
                        <div>
                          <Label htmlFor="ess-scale">{t("f.scale")}</Label>
                          <NativeSelect id="ess-scale" value={form.scale} onChange={(e) => set("scale", e.target.value)}>
                            <option value="">{t("unset")}</option>
                            {(["national", "subnational", "regional", "continental", "global"] as const).map((v) => (
                              <option key={v} value={v}>{t(`scale.${v}`)}</option>
                            ))}
                          </NativeSelect>
                        </div>
                        <div className="md:col-span-2">
                          <Button size="sm" variant="outline" onClick={() => saveEssentials.mutate(d.id)} disabled={!ess || saveEssentials.isPending}>
                            {c("save")}
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </section>
              )}

              {d.kind !== "correction" && (
                <section className="mt-8">
                  <h3 className="font-display text-[19px] font-semibold leading-[1.25]">{t("payload")}</h3>
                  {d.completeness && (
                    <p className="mt-1 text-[13px] tabular-nums text-muted-foreground">{t("completeness", { filled: d.completeness.filled, total: d.completeness.total })}</p>
                  )}
                  <dl className="mt-3 grid grid-cols-[minmax(0,13em)_minmax(0,1fr)] border-b-2 border-t border-rule text-[14px] max-md:grid-cols-[minmax(0,1fr)]">
                    {fields.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="border-b border-border py-2 pr-4 text-[12.5px] leading-[1.6] text-muted-foreground max-md:border-b-0 max-md:pb-0">{k}</dt>
                        <dd className="break-words border-b border-border py-2 leading-[1.5] [overflow-wrap:anywhere]">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                  {d.status === "pending" && (
                    <details className="mt-4 text-sm">
                      <summary className="link inline-flex min-h-6 cursor-pointer items-center">{t("editJson")}</summary>
                      <Textarea className="mt-2 font-mono text-xs" rows={10} value={draft || JSON.stringify(d.payload, null, 2)} onChange={(e) => setDraft(e.target.value)} aria-label={t("editJson")} />
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => save.mutate(d.id)} disabled={!draft}>
                        {c("save")}
                      </Button>
                    </details>
                  )}
                </section>
              )}

              {d.status === "pending" ? (
                <section className="mt-8 border-t-2 border-rule pt-4">
                  <h3 className="font-display text-[19px] font-semibold leading-[1.25]">{t("decision")}</h3>
                  <div className="mt-4 max-w-[46rem]">
                    <Label htmlFor="review-note">{t("noteLabel")}</Label>
                    <Textarea id="review-note" placeholder={t("notePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button onClick={() => approve.mutate(d.id)} disabled={approve.isPending || (d.errors?.length ?? 0) > 0 || missing.length > 0}>
                      <Check aria-hidden="true" strokeWidth={1.75} />
                      {t("approve")}
                    </Button>
                    <Button variant="outline" onClick={() => reject.mutate(d.id)} disabled={reject.isPending}>
                      <X aria-hidden="true" strokeWidth={1.75} />
                      {t("reject")}
                    </Button>
                  </div>
                  <p className="mt-3 max-w-[48em] font-display text-[14.5px] leading-[1.45] text-muted-foreground">
                    {d.kind === "study" ? t("approveHint") : d.kind === "tool" ? t("approveToolHint") : t("approveCorrectionHint")}
                  </p>
                </section>
              ) : (
                <p className="mt-8 border-t-2 border-rule pt-4 text-[14px] text-muted-foreground">
                  <span className="tabular-nums">{t("reviewed", { d: formatDate(d.reviewed_at, locale) })}</span>
                  {d.review_note ? <span className="font-display text-[15px] text-ink-2"> · {d.review_note}</span> : ""}
                </p>
              )}
            </article>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
