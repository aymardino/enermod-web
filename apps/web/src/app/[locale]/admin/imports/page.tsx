"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { KRINEA_URL } from "@/lib/site";

type ImportResult = { rows: number; created: number; errors: { title: string; error: string }[]; mapping?: Record<string, string> };

export default function ImportsPage() {
  const t = useTranslations("admin.imports");
  const c = useTranslations("common");
  const qc = useQueryClient();
  const [krinea, setKrinea] = useState<File | null>(null);
  const [survey, setSurvey] = useState<File | null>(null);
  const [mapping, setMapping] = useState("");
  const [result, setResult] = useState<{ kind: string; r: ImportResult } | null>(null);
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : c("error"));
  const done = (kind: string) => (r: ImportResult) => { setResult({ kind, r }); qc.invalidateQueries({ queryKey: ["admin-contributions"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); };
  const upKrinea = useMutation({ mutationFn: () => { const f = new FormData(); f.append("file", krinea!); return api.upload<ImportResult>("/admin/imports/krinea", f); }, onSuccess: done("krinea"), onError });
  const upSurvey = useMutation({ mutationFn: () => { const f = new FormData(); if (survey) f.append("file", survey); if (mapping) f.append("mapping", mapping); return api.upload<ImportResult>("/admin/imports/survey", f); }, onSuccess: done("survey"), onError });
  const metrics = useMutation({ mutationFn: () => api.post<{ status: string; result: Record<string, unknown> }>("/admin/metrics/refresh"), onSuccess: (j) => toast.success(j.status === "done" ? t("metricsDone", { n: Number(j.result.ok ?? 0) }) : t("queued")), onError });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title={t("title")} description={t("lede")} />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-semibold">{t("krinea.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("krinea.text")} <a href={KRINEA_URL} target="_blank" rel="noreferrer" className="text-primary underline">Krinea</a>.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground"><li>{t("krinea.s1")}</li><li>{t("krinea.s2")}</li><li>{t("krinea.s3")}</li></ol>
          <Input type="file" accept=".csv,.xlsx,.xls,.tsv" className="mt-4" onChange={(e) => setKrinea(e.target.files?.[0] ?? null)} />
          <Button className="mt-3" onClick={() => upKrinea.mutate()} disabled={!krinea || upKrinea.isPending}>{t("import")}</Button>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-semibold">{t("survey.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("survey.text")}</p>
          <Input type="file" accept=".csv,.xlsx,.tsv" className="mt-4" onChange={(e) => setSurvey(e.target.files?.[0] ?? null)} />
          <Textarea className="mt-3 font-mono text-xs" rows={4} placeholder={t("survey.mappingPlaceholder")} value={mapping} onChange={(e) => setMapping(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => upSurvey.mutate()} disabled={!survey || upSurvey.isPending}>{t("import")}</Button>
            <Button variant="outline" onClick={() => { setSurvey(null); upSurvey.mutate(); }} disabled={upSurvey.isPending}>{t("survey.sync")}</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("survey.syncHint")}</p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card md:col-span-2">
          <h2 className="font-semibold">{t("metrics.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("metrics.text")}</p>
          <Button variant="outline" className="mt-3" onClick={() => metrics.mutate()} disabled={metrics.isPending}>{t("metrics.run")}</Button>
        </section>
      </div>
      {result && (
        <div className="mt-6 rounded-2xl border border-brand-300 bg-brand-50 p-5 text-sm dark:bg-brand-950">
          <p className="font-semibold">{t("result", { kind: result.kind, rows: result.r.rows, created: result.r.created })}</p>
          {result.r.mapping && <p className="mt-2 text-xs text-muted-foreground">{t("mappingUsed")}: {JSON.stringify(result.r.mapping)}</p>}
          {result.r.errors.length > 0 && <ul className="mt-2 list-disc pl-5 text-coral-700">{result.r.errors.map((e, i) => <li key={i}>{e.title}: {e.error}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
