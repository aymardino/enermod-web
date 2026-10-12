"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, type Readiness } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AfricaMap } from "@/components/observatory/africa-map";
import { Columns, ReadinessScatter } from "@/components/observatory/charts";
import { ChipGroup } from "@/components/observatory/filters";
import { Callout, Kpi, Section } from "@/components/observatory/kpi";

export default function ReadinessPage() {
  const t = useTranslations("observatory.readiness");
  const c = useTranslations("common");
  const label = useLabel();
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [gov, setGov] = useState<string[]>([]);
  const [dat, setDat] = useState<string[]>([]);
  const [sort, setSort] = useState<"readiness_score" | "gap_score" | "n_studies" | "electrification_rate">("readiness_score");
  const r = useQuery<Readiness>({ queryKey: ["readiness"], queryFn: () => api.get("/stats/readiness") });
  const d = r.data;
  const rows = useMemo(() => {
    if (!d) return [];
    return d.countries
      .filter((x) => !q || x.country_name.toLowerCase().includes(q.toLowerCase()))
      .filter((x) => !regions.length || regions.includes(x.region))
      .filter((x) => !gov.length || gov.includes(x.energy_governance))
      .filter((x) => !dat.length || dat.includes(x.data_availability))
      .sort((a, b) => ((b[sort] ?? -1) as number) - ((a[sort] ?? -1) as number));
  }, [d, q, regions, gov, dat, sort]);
  const regionsAll = Array.from(new Set(d?.countries.map((x) => x.region) ?? [])).filter(Boolean);
  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{t("lede")}</p>
      {!d ? <Skeleton className="mt-8 h-72" /> : (
        <>
          <p className="mt-4 font-display text-lg italic text-muted-foreground">{t("headline", { n: d.n_below_4 })}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label={t("average")} value={`${d.average}/10`} hint={t("averageHint", { n: d.n_ranked })} tone="brand" />
            <Kpi label={t("goodData")} value={`${d.n_good_data}/${d.n_countries}`} />
            <Kpi label={t("strongGov")} value={`${d.n_strong_gov}/${d.n_countries}`} />
            <Kpi label={t("lts")} value={`${d.n_lts}/${d.n_countries}`} />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <p className="px-1 pb-1 text-sm font-semibold">{t("mapTitle")}</p>
              <AfricaMap data={d.countries.map((x) => ({ iso3: x.iso3, value: x.readiness_score, label: x.country_name, hint: `${label("governance", x.energy_governance)} · ${label("data", x.data_availability)}`, href: `/observatory/countries/${x.iso_code}` }))}
                colors={["#b71c1c", "#fdd835", "#1b5e20"]} domain={[0, 10]} legend={{ low: "0", high: "10" }} emptyLabel={t("notRanked")} />
              <p className="mt-2 px-1 text-xs text-muted-foreground">{t("mapCaption", { n: d.n_countries - d.n_ranked })}</p>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="text-sm font-semibold">{t("scatterTitle")}</p>
                <ReadinessScatter rows={d.countries.filter((x) => x.readiness_score !== null).map((x) => ({ name: x.country_name, region: x.region, readiness: x.readiness_score as number, gap: x.gap_score, studies: x.n_studies }))}
                  regionLabel={(x) => label("region", x)} xLabel={t("readinessAxis")} yLabel={t("gapAxis")} height={300} />
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="text-sm font-semibold">{t("distTitle")}</p>
                <Columns rows={d.distribution.map((x) => ({ label: x.range, value: x.countries }))} height={180} />
              </div>
            </div>
          </div>
          <Section title={t("tableTitle")}>
            <div className="mb-4 grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-[1fr_auto]">
              <div className="grid gap-4 sm:grid-cols-3">
                <ChipGroup label={t("region")} value={regions} onChange={setRegions} options={regionsAll.map((x) => ({ value: x, label: label("region", x) }))} />
                <ChipGroup label={t("governance")} value={gov} onChange={setGov} options={["strong", "moderate", "weak"].map((x) => ({ value: x, label: label("governance", x) }))} />
                <ChipGroup label={t("data")} value={dat} onChange={setDat} options={["good", "limited", "none"].map((x) => ({ value: x, label: label("data", x) }))} />
              </div>
              <div className="space-y-2">
                <Input placeholder={c("search")} value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 w-56 rounded-md border border-input bg-card px-3 text-sm">
                  <option value="readiness_score">{t("sort.readiness")}</option><option value="gap_score">{t("sort.gap")}</option><option value="n_studies">{t("sort.studies")}</option><option value="electrification_rate">{t("sort.elec")}</option>
                </select>
              </div>
            </div>
            <Table>
              <THead><TR><TH>{c("country")}</TH><TH>{t("region")}</TH><TH>{t("pool")}</TH><TH className="text-right">{c("studies")}</TH><TH>{t("readiness")}</TH><TH>{t("gap")}</TH><TH className="text-right">{t("elec")}</TH><TH>{t("data")}</TH><TH>{t("governance")}</TH><TH>NDC</TH><TH>LTS</TH></TR></THead>
              <TBody>
                {rows.map((x) => (
                  <TR key={x.iso_code}>
                    <TD><Link href={`/observatory/countries/${x.iso_code}`} className="font-medium hover:text-primary">{x.country_name}</Link></TD>
                    <TD className="text-muted-foreground">{label("region", x.region)}</TD><TD className="text-muted-foreground">{x.power_pool}</TD>
                    <TD className="tabular text-right">{x.n_studies}</TD>
                    <TD>{x.readiness_score === null ? <span className="text-xs text-muted-foreground">{t("notRanked")}</span> : <span className="inline-flex items-center gap-2"><span className="h-2 w-16 rounded-full bg-muted"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${x.readiness_score * 10}%` }} /></span><span className="tabular">{x.readiness_score}</span></span>}</TD>
                    <TD><span className="inline-flex items-center gap-2"><span className="h-2 w-16 rounded-full bg-muted"><span className="block h-full rounded-full bg-coral-500" style={{ width: `${x.gap_score}%` }} /></span><span className="tabular">{x.gap_score}</span></span></TD>
                    <TD className="tabular text-right">{Math.round(x.electrification_rate)}%</TD>
                    <TD className="text-muted-foreground">{label("data", x.data_availability)}</TD><TD className="text-muted-foreground">{label("governance", x.energy_governance)}</TD>
                    <TD>{label("yesno", x.has_ndc)}</TD><TD>{label("yesno", x.has_lts)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">{t("showing", { n: rows.length, total: d.n_countries })}</p>
          </Section>
          <Callout className="mt-8">{t("caveat")} <Link href="/methodology" className="underline">{t("methodLink")}</Link></Callout>
        </>
      )}
    </div>
  );
}
