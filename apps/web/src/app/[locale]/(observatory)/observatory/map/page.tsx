"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { api, qs, type CountrySummary, type Facets, type StudyPage } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { Skeleton } from "@/components/ui/misc";
import { AfricaMap } from "@/components/observatory/africa-map";
import { ChipGroup, YearRange } from "@/components/observatory/filters";
import { Section } from "@/components/observatory/kpi";
import { RowBars } from "@/components/observatory/charts";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";

type Metric = "studies" | "full" | "light" | "tools" | "gap" | "readiness";

export default function MapPage() {
  const t = useTranslations("observatory.map");
  const c = useTranslations("common");
  const label = useLabel();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("studies");
  const [levels, setLevels] = useState<string[]>([]);
  const [scales, setScales] = useState<string[]>([]);
  const [years, setYears] = useState<[number, number]>([2000, 2026]);
  const facets = useQuery<Facets>({ queryKey: ["facets"], queryFn: () => api.get("/studies/facets"), staleTime: 600_000 });
  const countries = useQuery<CountrySummary[]>({ queryKey: ["countries"], queryFn: () => api.get("/countries") });
  const filtering = levels.length > 0 || scales.length > 0 || years[0] > (facets.data?.year_min ?? 2000) || years[1] < (facets.data?.year_max ?? 2026);
  // When study filters are active, count studies per country on the filtered set (one request, all cards).
  const filtered = useQuery<StudyPage>({
    queryKey: ["map-studies", levels, scales, years],
    queryFn: () => api.get(`/studies${qs({ level: levels, scale: scales, year_min: years[0], year_max: years[1], page_size: 200, page: 1 })}`),
    enabled: filtering,
  });
  const counts = useMemo(() => {
    if (!filtering || !filtered.data) return null;
    const m = new Map<string, number>();
    for (const s of filtered.data.items) for (const iso of s.countries) m.set(iso, (m.get(iso) ?? 0) + 1);
    return m;
  }, [filtering, filtered.data]);
  const rows = useMemo(() => {
    if (!countries.data) return [];
    return countries.data.map((x) => {
      const v = metric === "studies" ? (counts ? counts.get(x.iso_code) ?? 0 : x.n_studies) : metric === "full" ? x.n_full : metric === "light" ? x.n_light
        : metric === "tools" ? x.n_tools : metric === "gap" ? x.gap_score : x.readiness_score;
      return { ...x, value: v };
    });
  }, [countries.data, metric, counts]);
  const colors = metric === "gap" ? ["#e5f0e8", "#e8a24a", "#b71c1c"] : metric === "readiness" ? ["#b71c1c", "#fdd835", "#1b5e20"] : ["#e5f0e8", "#2f7d4f", "#0c2518"];
  const sorted = [...rows].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const partial = filtering && filtered.data && filtered.data.total > 200;
  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{t("lede")}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-card lg:sticky lg:top-28 lg:self-start">
          <ChipGroup label={t("metric")} value={[metric]} onChange={(v) => setMetric((v[v.length - 1] as Metric) ?? "studies")}
            options={(["studies", "full", "light", "tools", "gap", "readiness"] as Metric[]).map((m) => ({ value: m, label: t(`metrics.${m}`) }))} />
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs text-muted-foreground">{t("filtersHint")}</p>
            <ChipGroup label={t("scope")} value={levels} onChange={setLevels} options={[{ value: "full", label: label("level", "full") }, { value: "light", label: label("level", "light") }]} />
            <ChipGroup className="mt-4" label={t("scale")} value={scales} onChange={setScales} options={(facets.data?.scale ?? []).map((o) => ({ value: o.value, label: label("scale", o.value), n: o.n }))} />
            <div className="mt-4"><YearRange min={facets.data?.year_min ?? 2000} max={facets.data?.year_max ?? 2026} value={years} onChange={setYears} label={t("years")} /></div>
            {partial && <p className="mt-3 text-xs text-amber-700">{t("partial", { n: 200, total: filtered.data!.total })}</p>}
          </div>
        </aside>
        <div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            {countries.data ? (
              <AfricaMap data={rows.map((x) => ({ iso3: x.iso3, value: x.value, label: x.country_name, hint: `${x.n_tools} ${t("toolsShort")}`, href: `/observatory/countries/${x.iso_code}` }))}
                colors={colors} domain={metric === "gap" ? [0, 100] : metric === "readiness" ? [0, 10] : undefined} legend={{ low: t("low"), high: t("high") }} emptyLabel={label("governance", "")}
                onSelect={(iso3) => { const cc = countries.data!.find((x) => x.iso3 === iso3); if (cc) router.push(`/observatory/countries/${cc.iso_code}`); }} />
            ) : <Skeleton className="aspect-square w-full" />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("caption")}</p>
          <Section title={t("ranking")} lede={t("rankingHint")}>
            <RowBars rows={sorted.slice(0, 15).map((x) => ({ label: x.country_name, value: x.value ?? 0, href: `/observatory/countries/${x.iso_code}` }))} />
          </Section>
          <Section title={t("table")}>
            <Table>
              <THead><TR><TH>{c("country")}</TH><TH>{t("region")}</TH><TH>{t("pool")}</TH><TH className="text-right">{c("studies")}</TH><TH className="text-right">{c("tools")}</TH><TH className="text-right">{t("metrics.gap")}</TH><TH className="text-right">{t("metrics.readiness")}</TH></TR></THead>
              <TBody>
                {sorted.map((x) => (
                  <TR key={x.iso_code}>
                    <TD><Link href={`/observatory/countries/${x.iso_code}`} className="font-medium hover:text-primary">{x.country_name}</Link></TD>
                    <TD className="text-muted-foreground">{label("region", x.region)}</TD><TD className="text-muted-foreground">{x.power_pool}</TD>
                    <TD className="tabular text-right">{counts ? counts.get(x.iso_code) ?? 0 : x.n_studies}</TD><TD className="tabular text-right">{x.n_tools}</TD>
                    <TD className="tabular text-right">{x.gap_score}</TD><TD className="tabular text-right">{x.readiness_score ?? "–"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Section>
        </div>
      </div>
    </div>
  );
}
