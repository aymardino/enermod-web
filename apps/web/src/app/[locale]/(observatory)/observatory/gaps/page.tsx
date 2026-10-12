"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, qs, type Gaps, type Overview } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AfricaMap, WorldOriginMap } from "@/components/observatory/africa-map";
import { Columns, CoverageBars, OriginBar } from "@/components/observatory/charts";
import { ChipGroup, LevelFilter } from "@/components/observatory/filters";
import { Callout, Kpi, Section } from "@/components/observatory/kpi";

export default function GapsPage() {
  const t = useTranslations("observatory.gaps");
  const c = useTranslations("common");
  const label = useLabel();
  const [level, setLevel] = useState<"full" | "light" | "all">("full");
  const [regions, setRegions] = useState<string[]>([]);
  const ov = useQuery<Overview>({ queryKey: ["overview"], queryFn: () => api.get("/stats/overview") });
  const g = useQuery<Gaps>({ queryKey: ["gaps", level, regions], queryFn: () => api.get(`/stats/gaps${qs({ level, region: regions })}`) });
  const d = g.data;
  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{t("lede")}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <LevelFilter value={level} onChange={setLevel} counts={{ full: ov.data?.n_full ?? 0, light: ov.data?.n_light ?? 0 }}
          labels={{ title: t("scope"), full: label("level", "full"), light: label("level", "light"), all: c("all"), help: level === "all" ? t("scopeAllHelp") : t("scopeHelp") }} />
        <div className="rounded-xl border border-border bg-card p-3 shadow-card">
          <ChipGroup label={t("region")} value={regions} onChange={setRegions} options={(ov.data?.regions ?? []).map((r) => ({ value: r, label: label("region", r) }))} />
          <p className="mt-2 text-xs text-muted-foreground">{t("regionHint")}</p>
        </div>
      </div>
      {!d ? <Skeleton className="mt-8 h-72" /> : (
        <>
          <Section title={t("featuresTitle")} lede={t("featuresLede", { n: d.n_studies })}>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <CoverageBars rows={d.features.map((f) => ({ label: label("feature", f.key), pct: f.pct, positive: f.positive, assessed: f.assessed }))} median={d.feature_median} />
              <p className="mt-2 text-xs text-muted-foreground">{t("featuresCaption")}</p>
            </div>
          </Section>
          <Section title={t("whoTitle")} lede={t("whoLede")}>
            <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <OriginBar origin={d.origin} labels={{ african_led: label("origin", "african_led"), mixed: label("origin", "mixed"), non_african: label("origin", "non_african") }} />
                <p className="mt-3 text-xs text-muted-foreground">{t("whoCaption", { n: d.origin.assessed })}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
                <p className="px-1 pb-1 text-sm font-semibold">{t("whereTitle")}</p>
                <WorldOriginMap rows={d.origin_map} labels={{ africa: t("mapAfrica"), outside: t("mapOutside"), studies: c("studies") }} />
                <p className="mt-2 px-1 text-xs text-muted-foreground">{t("whereCaption", { n: d.n_map_studies })}</p>
              </div>
            </div>
          </Section>
          <Section title={t("gapMapTitle")} lede={t("gapMapLede")}>
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
                <AfricaMap data={d.gap_map.map((x) => ({ iso3: x.iso3, value: x.gap_score, label: x.name, hint: `${x.n_studies} ${c("studies").toLowerCase()}`, href: `/observatory/countries/${x.iso2}` }))}
                  colors={["#e5f0e8", "#e8a24a", "#b71c1c"]} domain={[0, 100]} legend={{ low: t("lessGap"), high: t("moreGap") }} />
              </div>
              <div>
                <Table>
                  <THead><TR><TH>{c("country")}</TH><TH className="text-right">{c("studies")}</TH><TH className="text-right">{t("gapScore")}</TH><TH>{t("data")}</TH><TH>{t("governance")}</TH><TH className="text-right">{t("elec")}</TH></TR></THead>
                  <TBody>
                    {d.top_gap.map((x) => (
                      <TR key={x.iso2}>
                        <TD><Link href={`/observatory/countries/${x.iso2}`} className="font-medium hover:text-primary">{x.name}</Link></TD>
                        <TD className="tabular text-right">{x.n_studies}</TD>
                        <TD className="text-right"><span className="inline-flex items-center gap-2"><span className="h-2 w-16 rounded-full bg-muted"><span className="block h-full rounded-full bg-coral-500" style={{ width: `${x.gap_score}%` }} /></span><span className="tabular">{x.gap_score}</span></span></TD>
                        <TD className="text-muted-foreground">{label("data", x.data_availability)}</TD><TD className="text-muted-foreground">{label("governance", x.energy_governance)}</TD>
                        <TD className="tabular text-right">{Math.round(x.electrification_rate)}%</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <p className="mt-2 text-xs text-muted-foreground">{t("gapTableCaption")}</p>
              </div>
            </div>
          </Section>
          <Section title={t("financeTitle")} lede={t("financeLede")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label={t("modeRate")} value={`${d.financing.mode_rate}%`} hint={t("modeRateHint", { share: d.financing.mode_share, n: d.financing.n_rates })} tone="coral" />
              <Kpi label={t("varied")} value={d.financing.n_varied} hint={t("variedHint")} />
              <Kpi label={t("financingModelled")} value={`${d.financing.financing_pct}%`} hint={t("financingHint", { p: d.financing.financing_positive, n: d.financing.financing_assessed })} />
              <Kpi label={t("unstated")} value={d.financing.n_not_stated} hint={t("unstatedHint", { m: d.financing.n_mechanisms })} />
            </div>
            {d.financing.rate_distribution.length > 1 && (
              <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
                <Columns rows={d.financing.rate_distribution.map((r) => ({ label: `${r.rate}`, value: r.studies }))} color="#5E35B1" unit="%" />
                <p className="mt-2 text-xs text-muted-foreground">{t("rateCaption")}</p>
              </div>
            )}
          </Section>
          <Section title={t("emergingTitle")} lede={t("emergingLede")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Kpi label={t("agenda")} value={`${d.emerging.agenda_2063.positive} / ${d.emerging.agenda_2063.assessed}`} hint={t("ofAssessed", { p: d.emerging.agenda_2063.pct })} />
              <Kpi label={t("grey")} value={`${d.emerging.grey_literature.positive} / ${d.emerging.grey_literature.assessed}`} hint={t("ofAssessed", { p: d.emerging.grey_literature.pct })} />
            </div>
          </Section>
          <Callout className="mt-8">{t("method")} <Link href="/methodology" className="underline">{t("methodLink")}</Link></Callout>
        </>
      )}
    </div>
  );
}
