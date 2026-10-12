"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type RecommendOptions, type RecommendResult, type Recommendation } from "@/lib/api";
import { useLabel, useListLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Callout, Section } from "@/components/observatory/kpi";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

type Answers = { objective: string; scale: string; budget: string; capacity: string; horizon: string; data: string; extras: string[] };
const EMPTY: Answers = { objective: "", scale: "", budget: "", capacity: "", horizon: "", data: "", extras: [] };

function Pick({ label: l, value, onChange, options, render, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; render: (v: string) => string; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{l}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{render(o)}</option>)}
      </select>
    </div>
  );
}

export default function RecommenderPage() {
  const t = useTranslations("observatory.recommender");
  const r = useTranslations("recommender");
  const c = useTranslations("common");
  const label = useLabel();
  const list = useListLabel();
  const [a, setA] = useState<Answers>(EMPTY);
  const opts = useQuery<RecommendOptions>({ queryKey: ["reco-options"], queryFn: () => api.get("/recommend/options"), staleTime: Infinity });
  const allowed = a.objective && opts.data ? opts.data.allowed[a.objective] : null;
  const scaleOpts = allowed ? allowed[0] : opts.data?.scales ?? [];
  const horizonOpts = allowed ? allowed[1] : opts.data?.horizons ?? [];
  const run = useMutation({
    mutationFn: () => api.post<RecommendResult>("/recommend", { ...a, objective: a.objective || null, scale: a.scale || null, budget: a.budget || null, capacity: a.capacity || null, horizon: a.horizon || null, data: a.data || null }),
    onSuccess: () => track("recommend", a.objective || "none"),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : c("error")),
  });
  const res = run.data;
  const context = useMemo(() => {
    if (!res) return "";
    const answered = Object.entries(a).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") || "none" : v || "any"}`).join("; ");
    return `User answers: ${answered}\nRanking (tool, score): ${res.results.map((x) => `${x.tool_name} (${x.score})`).join(", ")}\nScoring weights: ${res.weights}`;
  }, [res, a]);
  const setObjective = (v: string) => {
    const al = opts.data?.allowed[v];
    setA({ ...a, objective: v, scale: al && !al[0].includes(a.scale) ? "" : a.scale, horizon: al && !al[1].includes(a.horizon) ? "" : a.horizon });
  };
  const top3 = res?.results.slice(0, 3) ?? [];
  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{t("lede")}</p>
      {!opts.data ? <Skeleton className="mt-8 h-64" /> : (
        <form className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-card" onSubmit={(e) => { e.preventDefault(); run.mutate(); }}>
          <div className="grid gap-5 md:grid-cols-2">
            <Pick label={`1. ${r("q.objective")}`} value={a.objective} onChange={setObjective} options={opts.data.objectives} render={(v) => r(`objective.${v}`)} placeholder={c("choose")} />
            <Pick label={`4. ${r("q.capacity")}`} value={a.capacity} onChange={(v) => setA({ ...a, capacity: v })} options={opts.data.capacities} render={(v) => r(`capacity.${v}`)} placeholder={c("choose")} />
            <Pick label={`2. ${r("q.scale")}`} value={a.scale} onChange={(v) => setA({ ...a, scale: v })} options={scaleOpts} render={(v) => r(`scale.${v}`)} placeholder={c("choose")} />
            <Pick label={`5. ${r("q.horizon")}`} value={a.horizon} onChange={(v) => setA({ ...a, horizon: v })} options={horizonOpts} render={(v) => r(`horizon.${v}`)} placeholder={c("choose")} />
            <Pick label={`3. ${r("q.budget")}`} value={a.budget} onChange={(v) => setA({ ...a, budget: v })} options={opts.data.budgets} render={(v) => r(`budget.${v}`)} placeholder={c("choose")} />
            <Pick label={`6. ${r("q.data")}`} value={a.data} onChange={(v) => setA({ ...a, data: v })} options={opts.data.data} render={(v) => r(`data.${v}`)} placeholder={c("choose")} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{r("q.allowedHint")}</p>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium">7. {r("q.extras")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {opts.data.extras.map((e) => {
                const on = a.extras.includes(e);
                return <button key={e} type="button" aria-pressed={on} onClick={() => setA({ ...a, extras: on ? a.extras.filter((x) => x !== e) : [...a.extras, e] })} className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-brand-600 bg-brand-600 text-white" : "border-border hover:border-brand-400"}`}>{r(`extras.${e}`)}</button>;
              })}
            </div>
          </fieldset>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={run.isPending}>{run.isPending ? c("loading") : t("run")}</Button>
            <Button type="button" variant="ghost" onClick={() => { setA(EMPTY); run.reset(); }}>{c("reset")}</Button>
            <p className="text-xs text-muted-foreground">{t("weightsHint")} <Link href="/methodology" className="underline">{t("methodLink")}</Link></p>
          </div>
        </form>
      )}
      {res && (
        <>
          <Section title={t("resultsTitle")} lede={<>{res.open_only && t("openOnly", { n: res.n_ranked })} {res.n_internal > 0 && t("internalNote", { n: res.n_internal })}</>}>
            <div className="grid gap-4 md:grid-cols-3">
              {top3.map((x, i) => <TopCard key={x.tool_name} x={x} rank={i} />)}
            </div>
          </Section>
          <Section title={t("comparison")}>
            <Table>
              <THead><TR><TH>{t("tool")}</TH><TH>{t("score")}</TH><TH>{t("licence")}</TH><TH>{t("programming")}</TH><TH>{t("horizon")}</TH><TH>{t("scale")}</TH><TH>{t("data")}</TH><TH className="text-right">{t("africaStudies")}</TH><TH>{t("why")}</TH></TR></THead>
              <TBody>
                {res.results.map((x) => (
                  <TR key={x.tool_name}>
                    <TD><Link href={`/observatory/tools/${encodeURIComponent(x.tool_name)}`} className="font-medium hover:text-primary">{x.tool_name}</Link></TD>
                    <TD><span className="inline-flex items-center gap-2"><span className="h-2 w-20 rounded-full bg-muted"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(0, x.score))}%` }} /></span><span className="tabular">{x.score}</span></span></TD>
                    <TD className="text-muted-foreground">{label("license", x.license)}{x.free_for_developing === "yes" && x.license !== "open_source" ? ` (${t("freeLic")})` : ""}</TD>
                    <TD className="text-muted-foreground">{label("programming", x.programming_required)}</TD>
                    <TD className="text-muted-foreground">{list("horizon", x.time_horizon)}</TD><TD className="text-muted-foreground">{list("toolscale", x.scale)}</TD>
                    <TD className="text-muted-foreground">{label("data_intensity", x.data_intensity)}</TD><TD className="tabular text-right">{x.n_studies}</TD>
                    <TD className="text-xs text-muted-foreground">{Object.entries(x.breakdown).map(([k, v]) => `${r(`breakdown.${k}`)} ${v > 0 ? "+" : ""}${v}`).join(" · ")}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Section>
          <Callout className="mt-6">{t("disclaimer")}</Callout>
        </>
      )}
      {!res && opts.data && (
        <Section title={t("allToolsTitle")} lede={t("allToolsLede")}>
          <Button variant="outline" asChild><Link href="/observatory/tools">{t("browseTools")}</Link></Button>
        </Section>
      )}
      <AssistantWidget context={context} />
    </div>
  );
}

function TopCard({ x, rank }: { x: Recommendation; rank: number }) {
  const t = useTranslations("observatory.recommender");
  const r = useTranslations("recommender");
  const label = useLabel();
  const list = useListLabel();
  return (
    <div className={`rounded-2xl border p-5 shadow-card ${rank === 0 ? "border-brand-500 bg-brand-50 dark:bg-brand-950" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between"><Badge variant={rank === 0 ? "brand" : "secondary"}>{rank === 0 ? t("best") : `#${rank + 1}`}</Badge><span className="font-display text-2xl font-semibold tabular">{x.score}</span></div>
      <h3 className="mt-3 font-display text-xl font-semibold"><Link href={`/observatory/tools/${encodeURIComponent(x.tool_name)}`} className="hover:text-primary">{x.tool_name}</Link></h3>
      <p className="text-sm text-muted-foreground">{x.full_name}</p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("licence")}</dt><dd className="text-right">{label("license", x.license)}{x.proprietary_dependency && x.proprietary_dependency.toLowerCase() !== "none" ? <span className="block text-xs text-muted-foreground">{t("requires")} {x.proprietary_dependency}</span> : null}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("programming")}</dt><dd>{label("programming", x.programming_required)}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("learning")}</dt><dd>{label("learning", x.learning_curve)}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("horizon")}</dt><dd className="text-right">{list("horizon", x.time_horizon)}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("africaStudies")}</dt><dd className="tabular">{x.n_studies}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground"><b>{t("bestFor")}:</b> {list("bestfor", x.best_for)}</p>
      <ul className="mt-3 flex flex-wrap gap-1">{Object.entries(x.breakdown).map(([k, v]) => <li key={k}><Badge variant={v >= 0 ? "outline" : "secondary"}>{r(`breakdown.${k}`)} {v > 0 ? "+" : ""}{v}</Badge></li>)}</ul>
      {(x.strengths || x.weaknesses) && <details className="mt-3 text-sm"><summary className="cursor-pointer text-primary">{t("prosCons")}</summary><p className="mt-2 text-muted-foreground"><b>{t("strengths")}.</b> {x.strengths || "–"}</p><p className="mt-1 text-muted-foreground"><b>{t("weaknesses")}.</b> {x.weaknesses || "–"}</p></details>}
      {x.info_source && <p className="mt-3 text-xs text-muted-foreground"><ExternalLink className="inline size-3" /> {t("sources")}: {x.info_source.slice(0, 120)}{x.info_source.length > 120 ? "…" : ""}{x.info_date ? ` (${t("checked")} ${x.info_date})` : ""}</p>}
    </div>
  );
}
