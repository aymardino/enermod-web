"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { api, type Analytics } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { Kpi } from "@/components/observatory/kpi";
import { Columns, RowBars } from "@/components/observatory/charts";

export default function AnalyticsPage() {
  const t = useTranslations("admin.analytics");
  const locale = useLocale();
  const [days, setDays] = useState(30);
  const { data: d } = useQuery<Analytics>({ queryKey: ["analytics", days], queryFn: () => api.get(`/admin/analytics?days=${days}`) });
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={t("title")} description={t("lede")} actions={<select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-md border border-input bg-card px-3 text-sm">{[7, 30, 90, 365].map((n) => <option key={n} value={n}>{t("days", { n })}</option>)}</select>} />
      {!d ? <Skeleton className="h-64" /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label={t("visitors")} value={d.visitors} tone="brand" />
            <Kpi label={t("pageViews")} value={d.by_kind.page_view ?? 0} />
            <Kpi label={t("recommender")} value={d.by_kind.recommend ?? 0} />
            <Kpi label={t("chat")} value={d.chat.n} hint={t("chatFailed", { n: d.chat.failed })} />
            <Kpi label={t("downloads")} value={d.by_kind.download ?? 0} hint={Object.entries(d.locales).map(([k, v]) => `${k || "?"}: ${v}`).join(" · ")} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-semibold">{t("daily")}</p><Columns rows={d.daily.map((x) => ({ label: x.day.slice(5), value: x.n }))} height={200} /></div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-semibold">{t("pages")}</p><RowBars className="mt-3" rows={d.pages.slice(0, 12).map((x) => ({ label: x.path, value: x.n }))} /></div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-semibold">{t("tools")}</p><RowBars className="mt-3" rows={d.tools.slice(0, 10).map((x) => ({ label: x.ref, value: x.n }))} /></div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-semibold">{t("countries")}</p><RowBars className="mt-3" rows={d.countries.slice(0, 10).map((x) => ({ label: x.ref, value: x.n }))} /></div>
          </div>
          <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm font-semibold">{t("questions")}</p>
            <ul className="mt-2 divide-y divide-border text-sm">
              {d.chat.recent.length === 0 && <li className="py-2 text-muted-foreground">{t("noQuestions")}</li>}
              {d.chat.recent.map((q, i) => <li key={i} className="flex items-start justify-between gap-3 py-2"><span>{q.question}</span><span className="shrink-0 text-xs text-muted-foreground"><Badge variant={q.ok ? "brand" : "secondary"}>{q.ok ? `${q.n_citations} ${t("citations")}` : t("failed")}</Badge> {q.locale} · {formatDate(q.at, locale)}</span></li>)}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
