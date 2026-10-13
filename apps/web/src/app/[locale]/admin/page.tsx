"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, type AdminOverview } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AdminPage, JobStatus } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { Kpi, KpiStrip } from "@/components/observatory/kpi";
import { Block } from "@/components/observatory/page-head";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default function AdminOverviewPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const format = useFormatter();
  const n = (v: number) => format.number(v);
  const { data: d } = useQuery<AdminOverview>({ queryKey: ["admin-overview"], queryFn: () => api.get("/admin/overview"), refetchInterval: 15_000 });
  if (!d) {
    return (
      <AdminPage>
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="mt-10 h-36" />
        <Skeleton className="mt-12 h-64" />
      </AdminPage>
    );
  }
  const run = d.last_discovery;
  const jobKind = (k: string) => (t.has(`jobs.kinds.${k}`) ? t(`jobs.kinds.${k}`) : k);
  return (
    <AdminPage>
      <PageHeader title={t("overview.title")} description={t("overview.lede")} />
      <KpiStrip>
        <Kpi
          href="/admin/contributions"
          label={t("overview.pending")}
          value={n(d.pending_contributions)}
          tone={d.pending_contributions ? "coral" : undefined}
          hint={t("overview.pendingHint")}
        />
        <Kpi href="/admin/discovery" label={t("overview.candidates")} value={n(d.new_candidates)} hint={t("overview.candidatesHint", { n: d.relevant_candidates })} />
        <Kpi label={t("overview.visitors")} value={n(d.usage.visitors)} hint={t("overview.visitorsHint", { n: d.usage.events })} />
        <Kpi
          label={t("overview.users")}
          value={n(d.users)}
          hint={d.last_metrics_at ? t("overview.metricsAt", { d: formatDate(d.last_metrics_at, locale) }) : t("overview.noMetrics")}
        />
      </KpiStrip>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        <Block
          title={t("overview.discovery")}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/discovery">{t("nav.discovery")}</Link>
            </Button>
          }
        >
          {run ? (
            <dl className="grid grid-cols-[minmax(0,10em)_minmax(0,1fr)] border-t border-rule text-[14px] max-sm:grid-cols-[minmax(0,8.5em)_minmax(0,1fr)]">
              <dt className="border-b border-border py-2.5 pr-3 text-[13px] text-muted-foreground">{t("overview.lastRunLabel")}</dt>
              <dd className="border-b border-border py-2.5 tabular-nums">{formatDate(run.started_at, locale)}</dd>
              <dt className="border-b border-border py-2.5 pr-3 text-[13px] text-muted-foreground">{t("jobs.status")}</dt>
              <dd className="border-b border-border py-2 tabular-nums">
                <JobStatus status={run.status} />
              </dd>
              <dt className="border-b-2 border-rule py-2.5 pr-3 text-[13px] text-muted-foreground">{t("jobs.result")}</dt>
              <dd className="border-b-2 border-rule py-2.5 tabular-nums">{t("overview.runResult", { n: run.n_new, f: run.n_fetched })}</dd>
            </dl>
          ) : (
            <p className="not-assessed text-[15px]">{t("overview.noRun")}</p>
          )}
        </Block>

        <Block title={t("overview.jobs")}>
          <Table>
            <THead>
              <TR>
                <TH>{t("jobs.kind")}</TH>
                <TH>{t("jobs.status")}</TH>
                <TH>{t("jobs.when")}</TH>
                <TH lowPriority>{t("jobs.result")}</TH>
              </TR>
            </THead>
            <TBody className="[&>tr:last-child>td]:border-b-2 [&>tr:last-child>td]:border-rule">
              {d.jobs.length === 0 && (
                <TR>
                  <TD colSpan={4} className="not-assessed text-[15px]">
                    {t("jobs.empty")}
                  </TD>
                </TR>
              )}
              {d.jobs.map((j) => {
                const result = j.error || JSON.stringify(j.result);
                return (
                  <TR key={j.id}>
                    <TD className="font-medium">{jobKind(j.kind)}</TD>
                    <TD>
                      <JobStatus status={j.status} />
                    </TD>
                    <TD className="text-[13px] tabular-nums text-muted-foreground">{formatDate(j.created_at, locale)}</TD>
                    <TD lowPriority className={j.error ? "max-w-[300px] truncate text-[12.5px] text-destructive" : "max-w-[300px] truncate text-[12.5px] text-muted-foreground"} title={result}>
                      {result}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Block>
      </div>
    </AdminPage>
  );
}
