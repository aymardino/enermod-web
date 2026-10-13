"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { AdminPage } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { FieldHint, Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/misc";
import { Block } from "@/components/observatory/page-head";
import { Callout } from "@/components/observatory/kpi";
import { KRINEA_URL } from "@/lib/site";

type ImportResult = { rows: number; created: number; errors: { title: string; error: string }[]; mapping?: Record<string, string> };

export default function ImportsPage() {
  const t = useTranslations("admin.imports");
  const c = useTranslations("common");
  /** French sets a narrow no-break space before the colon */
  const colon = useLocale() === "fr" ? "\u202f:" : ":";
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
  const resultKind = result ? (result.kind === "krinea" ? t("krinea.title") : result.kind === "survey" ? t("survey.title") : result.kind) : "";

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("lede")} />

      {/* the outcome of the last import: a callout (rubric rule), announced politely */}
      <div role="status" aria-live="polite">
        {result && (
          <Callout tone="brand" className="mb-12 max-w-[60em] not-italic">
            <p className="font-display text-[16px] text-foreground">{t("result", { kind: resultKind, rows: result.r.rows, created: result.r.created })}</p>
            {result.r.mapping && (
              <p className="mt-2 font-sans text-[12.5px] not-italic text-muted-foreground [overflow-wrap:anywhere]">
                {t("mappingUsed")}{colon} <code className="font-mono text-[12px]">{JSON.stringify(result.r.mapping)}</code>
              </p>
            )}
            {result.r.errors.length > 0 && (
              <ul className="mt-2 space-y-1 font-sans text-[13px] not-italic leading-[1.45] text-destructive">
                {result.r.errors.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <X aria-hidden="true" strokeWidth={1.75} className="mt-[3px] size-3.5 shrink-0" />
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {e.title}{colon} {e.error}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Callout>
        )}
      </div>

      <div className="grid gap-x-12 gap-y-14 md:grid-cols-2">
        <Block title={t("krinea.title")}>
          <p className="max-w-[44em] text-[14.5px] leading-[1.55] text-ink-2">
            {t("krinea.text")}{" "}
            <a href={KRINEA_URL} target="_blank" rel="noreferrer" className="link">
              Krinea
            </a>
            .
          </p>
          <ol className="mt-4 border-t border-border text-[14px] leading-[1.5]">
            {(["s1", "s2", "s3"] as const).map((k, i) => (
              <li key={k} className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-2 border-b border-border py-2">
                <span aria-hidden="true" className="font-semibold tabular-nums text-rubric">{i + 1}</span>
                <span className="text-ink-2">{t(`krinea.${k}`)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <Label htmlFor="import-krinea">{t("file")}</Label>
            <Input id="import-krinea" type="file" accept=".csv,.xlsx,.xls,.tsv" onChange={(e) => setKrinea(e.target.files?.[0] ?? null)} />
          </div>
          <Button className="mt-4" onClick={() => upKrinea.mutate()} disabled={!krinea || upKrinea.isPending}>
            {t("import")}
          </Button>
        </Block>

        <Block title={t("survey.title")}>
          <p className="max-w-[44em] text-[14.5px] leading-[1.55] text-ink-2">{t("survey.text")}</p>
          <div className="mt-6">
            <Label htmlFor="import-survey">{t("responses")}</Label>
            <Input id="import-survey" type="file" accept=".csv,.xlsx,.tsv" onChange={(e) => setSurvey(e.target.files?.[0] ?? null)} />
          </div>
          <div className="mt-5">
            <Label htmlFor="import-mapping">{t("mapping")}</Label>
            <Textarea id="import-mapping" className="min-h-0 font-mono text-xs" rows={4} placeholder={t("survey.mappingPlaceholder")} value={mapping} onChange={(e) => setMapping(e.target.value)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => upSurvey.mutate()} disabled={!survey || upSurvey.isPending}>
              {t("import")}
            </Button>
            <Button variant="outline" onClick={() => { setSurvey(null); upSurvey.mutate(); }} disabled={upSurvey.isPending}>
              {t("survey.sync")}
            </Button>
          </div>
          <FieldHint className="mt-2.5">{t("survey.syncHint")}</FieldHint>
        </Block>

        <Block title={t("metrics.title")} className="md:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <p className="max-w-[52em] text-[14.5px] leading-[1.55] text-ink-2">{t("metrics.text")}</p>
            <Button variant="outline" onClick={() => metrics.mutate()} disabled={metrics.isPending}>
              {t("metrics.run")}
            </Button>
          </div>
        </Block>
      </div>
    </AdminPage>
  );
}
