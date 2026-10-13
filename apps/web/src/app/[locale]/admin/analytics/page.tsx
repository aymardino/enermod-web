"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { api, type Analytics } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AdminPage } from "@/components/admin/admin-shell";
import { StatusTag } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Kpi, KpiStrip } from "@/components/observatory/kpi";
import { Block } from "@/components/observatory/page-head";
import { Columns, RowBars } from "@/components/observatory/charts";
import { countryInfo } from "@/components/observatory/study-card";

export default function AnalyticsPage() {
  const t = useTranslations("admin.analytics");
  const locale = useLocale();
  const format = useFormatter();
  const n = (v: number) => format.number(v);
  const [days, setDays] = useState(30);
  const { data: d } = useQuery<Analytics>({ queryKey: ["analytics", days], queryFn: () => api.get(`/admin/analytics?days=${days}`) });
  const nothing = <p className="not-assessed text-[15px]">{t("nothing")}</p>;
  const country = (code: string) => {
    const c = countryInfo(code, locale);
    return c.name === code ? code : `${c.name} · ${c.iso3}`;
  };

  return (
    <AdminPage>
      <PageHeader
        title={t("title")}
        description={t("lede")}
        actions={
          <div className="w-48">
            <Label htmlFor="analytics-days">{t("period")}</Label>
            <NativeSelect id="analytics-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 30, 90, 365].map((v) => (
                <option key={v} value={v}>
                  {t("days", { n: v })}
                </option>
              ))}
            </NativeSelect>
          </div>
        }
      />
      {!d ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <KpiStrip>
            <Kpi label={t("visitors")} value={n(d.visitors)} />
            <Kpi label={t("pageViews")} value={n(d.by_kind.page_view ?? 0)} />
            <Kpi label={t("recommender")} value={n(d.by_kind.recommend ?? 0)} />
            <Kpi label={t("chat")} value={n(d.chat.n)} hint={t("chatFailed", { n: d.chat.failed })} />
            <Kpi
              label={t("downloads")}
              value={n(d.by_kind.download ?? 0)}
              hint={Object.entries(d.locales)
                .map(([k, v]) => `${k ? k.toUpperCase() : "?"} ${n(v)}`)
                .join(" · ")}
            />
          </KpiStrip>

          <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
            <Block title={t("daily")}>
              {d.daily.length ? <Columns rows={d.daily.map((x) => ({ label: x.day.slice(5), value: x.n }))} height={200} ariaLabel={t("daily")} /> : nothing}
            </Block>
            <Block title={t("pages")}>
              {d.pages.length ? <RowBars rows={d.pages.slice(0, 12).map((x) => ({ label: x.path, value: x.n }))} labelWidth="wide" ariaLabel={t("pages")} /> : nothing}
            </Block>
            <Block title={t("tools")}>
              {d.tools.length ? <RowBars rows={d.tools.slice(0, 10).map((x) => ({ label: x.ref, value: x.n }))} ariaLabel={t("tools")} /> : nothing}
            </Block>
            <Block title={t("countries")}>
              {d.countries.length ? <RowBars rows={d.countries.slice(0, 10).map((x) => ({ label: country(x.ref), value: x.n }))} labelWidth="wide" ariaLabel={t("countries")} /> : nothing}
            </Block>
          </div>

          <Block title={t("questions")} className="mt-12">
            {d.chat.recent.length === 0 ? (
              <p className="not-assessed text-[15px]">{t("noQuestions")}</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{t("col.question")}</TH>
                    <TH>{t("col.answer")}</TH>
                    <TH lowPriority>{t("col.locale")}</TH>
                    <TH numeric>{t("col.when")}</TH>
                  </TR>
                </THead>
                <TBody className="[&>tr:last-child>td]:border-b-2 [&>tr:last-child>td]:border-rule">
                  {d.chat.recent.map((q, i) => (
                    <TR key={i}>
                      <TD className="min-w-[16em] whitespace-normal font-display text-[15.5px] leading-[1.4]">{q.question}</TD>
                      <TD>
                        <StatusTag status={q.ok ? "ok" : "failed"}>{q.ok ? t("nCitations", { n: q.n_citations }) : t("failed")}</StatusTag>
                      </TD>
                      <TD lowPriority className="text-[13px] uppercase text-muted-foreground">{q.locale}</TD>
                      <TD numeric className="text-[13px] text-muted-foreground">{formatDate(q.at, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Block>
        </>
      )}
    </AdminPage>
  );
}
