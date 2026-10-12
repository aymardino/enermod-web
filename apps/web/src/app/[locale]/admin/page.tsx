"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, type AdminOverview } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton, PageHeader } from "@/components/ui/misc";
import { Kpi } from "@/components/observatory/kpi";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminOverviewPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const { data: d } = useQuery<AdminOverview>({ queryKey: ["admin-overview"], queryFn: () => api.get("/admin/overview"), refetchInterval: 15_000 });
  if (!d) return <div className="mx-auto max-w-7xl p-6"><Skeleton className="h-64" /></div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={t("overview.title")} description={t("overview.lede")} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/contributions"><Kpi label={t("overview.pending")} value={d.pending_contributions} tone={d.pending_contributions ? "coral" : undefined} hint={t("overview.pendingHint")} /></Link>
        <Link href="/admin/discovery"><Kpi label={t("overview.candidates")} value={d.new_candidates} hint={t("overview.candidatesHint", { n: d.relevant_candidates })} /></Link>
        <Kpi label={t("overview.visitors")} value={d.usage.visitors} hint={t("overview.visitorsHint", { n: d.usage.events })} />
        <Kpi label={t("overview.users")} value={d.users} hint={d.last_metrics_at ? t("overview.metricsAt", { d: formatDate(d.last_metrics_at, locale) }) : t("overview.noMetrics")} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-semibold">{t("overview.discovery")}</h2>
          {d.last_discovery ? <p className="mt-2 text-sm text-muted-foreground">{t("overview.lastRun", { d: formatDate(d.last_discovery.started_at, locale), status: d.last_discovery.status, n: d.last_discovery.n_new, f: d.last_discovery.n_fetched })}</p> : <p className="mt-2 text-sm text-muted-foreground">{t("overview.noRun")}</p>}
          <Button className="mt-4" variant="outline" asChild><Link href="/admin/discovery">{t("nav.discovery")}</Link></Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-semibold">{t("overview.jobs")}</h2>
          <Table>
            <THead><TR><TH>{t("jobs.kind")}</TH><TH>{t("jobs.status")}</TH><TH>{t("jobs.when")}</TH><TH>{t("jobs.result")}</TH></TR></THead>
            <TBody>{d.jobs.map((j) => <TR key={j.id}><TD>{j.kind}</TD><TD><Badge variant={j.status === "done" ? "brand" : j.status === "failed" ? "secondary" : "outline"}>{j.status}</Badge></TD><TD className="text-xs text-muted-foreground">{formatDate(j.created_at, locale)}</TD><TD className="max-w-[260px] truncate text-xs text-muted-foreground" title={j.error || JSON.stringify(j.result)}>{j.error || JSON.stringify(j.result)}</TD></TR>)}</TBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
