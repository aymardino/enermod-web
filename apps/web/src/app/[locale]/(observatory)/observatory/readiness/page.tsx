"use client";

import { useId, useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, type CountrySummary, type Readiness } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { NotAssessed } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/misc";
import { NativeSelect } from "@/components/ui/select";
import { IsoCode, Meter, Table, TBody, TD, TH, THead, TR, countryLinkClass } from "@/components/ui/table";
import { AfricaMap } from "@/components/observatory/africa-map";
import { ReadinessScatter } from "@/components/observatory/charts";
import { ChipGroup } from "@/components/observatory/filters";
import { Callout, Kpi, KpiStrip } from "@/components/observatory/kpi";
import { Block, PageHead } from "@/components/observatory/page-head";
import { countryInfo } from "@/components/observatory/study-card";

/** Page container of the observatory: 1248px, 1400px from 2xl, 32px gutters (16px on phones). */
const WRAP = "mx-auto w-full max-w-[1248px] px-8 pb-[72px] max-md:px-4 2xl:max-w-[1400px]";
const REGION_ORDER = ["north", "west", "central", "east", "southern"];
type SortKey = "readiness_score" | "gap_score" | "n_studies" | "electrification_rate";
type Facet = "region" | "gov" | "dat";

/** Lower case without accents, so "ethiopie" finds "Éthiopie". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default function ReadinessPage() {
  const t = useTranslations("observatory.readiness");
  const c = useTranslations("common");
  const label = useLabel();
  const locale = useLocale();
  const format = useFormatter();
  const searchId = useId();
  const sortId = useId();
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [gov, setGov] = useState<string[]>([]);
  const [dat, setDat] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("readiness_score");
  const r = useQuery<Readiness>({ queryKey: ["readiness"], queryFn: () => api.get("/stats/readiness") });
  const d = r.data;
  // English keeps the inventory's names; French takes them from the shared country list
  const nameOf = (x: CountrySummary) => {
    const info = countryInfo(x.iso_code, locale);
    return locale === "en" || !info.pool ? x.country_name : info.name;
  };
  const colon = locale === "fr" ? " : " : ": ";

  /** Whether a country passes the search and every facet except `skip` (live facet counts,). */
  const passes = useMemo(() => {
    const needle = fold(q.trim());
    return (x: CountrySummary, skip?: Facet) =>
      (!needle || fold(countryInfo(x.iso_code, locale).name).includes(needle) || fold(x.country_name).includes(needle) || fold(x.iso3) === needle) &&
      (skip === "region" || !regions.length || regions.includes(x.region)) &&
      (skip === "gov" || !gov.length || gov.includes(x.energy_governance)) &&
      (skip === "dat" || !dat.length || dat.includes(x.data_availability));
  }, [q, regions, gov, dat, locale]);
  const rows = useMemo(() => {
    if (!d) return [];
    return d.countries.filter((x) => passes(x)).sort((a, b) => ((b[sort] ?? -1) as number) - ((a[sort] ?? -1) as number));
  }, [d, passes, sort]);
  const facetCount = (facet: Facet, key: keyof CountrySummary, value: string) => (d ? d.countries.filter((x) => x[key] === value && passes(x, facet)).length : 0);
  const regionsAll = Array.from(new Set(d?.countries.map((x) => x.region) ?? []))
    .filter(Boolean)
    .sort((a, b) => (REGION_ORDER.indexOf(a) + 1 || 99) - (REGION_ORDER.indexOf(b) + 1 || 99));
  const sorted = (key: SortKey) => (sort === key ? ("descending" as const) : undefined);
  const pct = (v: number) => format.number(v / 100, { style: "percent", maximumFractionDigits: 0 });
  const notRanked = t("notRanked");

  return (
    <div className={WRAP}>
      <PageHead section="readiness" title={t("title")} lede={t("lede")} />
      {!d ? (
        <>
          <Skeleton className="mt-8 h-32" />
          <Skeleton className="mt-11 h-96" />
        </>
      ) : (
        <>
          <KpiStrip className="mt-8">
            <Kpi label={t("average")} value={`${format.number(d.average)}/10`} hint={t("averageHint", { n: d.n_ranked })} />
            <Kpi label={t("goodData")} value={`${format.number(d.n_good_data)}/${format.number(d.n_countries)}`} />
            <Kpi label={t("strongGov")} value={`${format.number(d.n_strong_gov)}/${format.number(d.n_countries)}`} />
            <Kpi label={t("lts")} value={`${format.number(d.n_lts)}/${format.number(d.n_countries)}`} />
          </KpiStrip>
          <Callout tone="brand" className="mt-6 max-w-[46em]">{t("headline", { n: d.n_below_4 })}</Callout>

          <div className="mt-11 grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-12 max-lg:grid-cols-[minmax(0,1fr)]">
            <Block title={t("mapTitle")} description={t("mapLede")}>
              <AfricaMap
                data={d.countries.map((x) => ({
                  iso3: x.iso3,
                  value: x.readiness_score,
                  label: nameOf(x),
                  hint: `${t("governance")}${colon}${label("governance", x.energy_governance)} · ${t("data")}${colon}${label("data", x.data_availability)}`,
                  href: `/observatory/countries/${x.iso_code}`,
                }))}
                metric="readiness"
                legendTitle={t("readiness")}
                emptyLabel={notRanked.charAt(0).toUpperCase() + notRanked.slice(1)}
                formatValue={(v) => `${t("readiness")} ${format.number(v)}/10`}
                ariaLabel={t("mapTitle")}
                fig={1}
                caption={t("mapCaption", { n: d.n_countries - d.n_ranked })}
                className="max-lg:mx-auto max-lg:w-full max-lg:max-w-[620px]"
              />
            </Block>
            <Block title={t("scatterTitle")} description={t("scatterLede")}>
              <ReadinessScatter
                rows={d.countries
                  .filter((x) => x.readiness_score !== null)
                  .map((x) => ({ name: nameOf(x), iso3: x.iso3, region: x.region, readiness: x.readiness_score as number, gap: x.gap_score, studies: x.n_studies }))}
                regionLabel={(x) => label("region", x)}
                xLabel={t("readinessAxis")}
                yLabel={t("gapAxis")}
                ariaLabel={t("scatterTitle")}
              />
            </Block>
          </div>

          <Block
            className="mt-12"
            title={t("tableTitle")}
            description={<span aria-live="polite">{t("showing", { n: rows.length, total: d.n_countries })}</span>}
          >
            <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
              <ChipGroup
                label={t("region")}
                value={regions}
                onChange={setRegions}
                options={regionsAll.map((x) => ({ value: x, label: label("region", x), n: facetCount("region", "region", x) }))}
              />
              <ChipGroup
                label={t("governance")}
                value={gov}
                onChange={setGov}
                options={["strong", "moderate", "weak"].map((x) => ({ value: x, label: label("governance", x), n: facetCount("gov", "energy_governance", x) }))}
              />
              <ChipGroup
                label={t("data")}
                value={dat}
                onChange={setDat}
                options={["good", "limited", "none"].map((x) => ({ value: x, label: label("data", x), n: facetCount("dat", "data_availability", x) }))}
              />
              <div className="flex flex-wrap items-end gap-x-4 gap-y-4 max-md:w-full">
                <div className="w-56 max-md:w-full">
                  <Label htmlFor={searchId}>{t("searchLabel")}</Label>
                  <Input id={searchId} type="search" placeholder={c("search")} value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="w-56 max-md:w-full">
                  <Label htmlFor={sortId}>{t("sortLabel")}</Label>
                  <NativeSelect id={sortId} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                    <option value="readiness_score">{t("sort.readiness")}</option>
                    <option value="gap_score">{t("sort.gap")}</option>
                    <option value="n_studies">{t("sort.studies")}</option>
                    <option value="electrification_rate">{t("sort.elec")}</option>
                  </NativeSelect>
                </div>
              </div>
            </div>

            <Table stickyFirst wrapperClassName="mt-7">
              <THead>
                <TR>
                  <TH>{c("country")}</TH>
                  <TH numeric sort={sorted("readiness_score")}>{t("readiness")}</TH>
                  <TH className="whitespace-normal">{t("governance")}</TH>
                  <TH className="whitespace-normal">{t("data")}</TH>
                  <TH numeric sort={sorted("electrification_rate")}>{t("elec")}</TH>
                  <TH>{t("ndc")}</TH>
                  <TH>{t("ltsShort")}</TH>
                  <TH numeric sort={sorted("gap_score")}>{t("gap")}</TH>
                  <TH numeric sort={sorted("n_studies")}>{c("studies")}</TH>
                  <TH lowPriority>{t("region")}</TH>
                  <TH lowPriority>{t("pool")}</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((x) => (
                  <TR key={x.iso_code}>
                    <TD className="lg:whitespace-normal">
                      <span className="flex items-baseline">
                        <IsoCode>{x.iso3}</IsoCode>
                        <Link href={`/observatory/countries/${x.iso_code}`} className={countryLinkClass}>{nameOf(x)}</Link>
                      </span>
                    </TD>
                    <TD numeric>
                      <Meter value={x.readiness_score} max={10} label={x.readiness_score === null ? undefined : format.number(x.readiness_score)} empty={notRanked} />
                    </TD>
                    <TD className="text-ink-2">{x.energy_governance ? label("governance", x.energy_governance) : <NotAssessed>{label("governance", "")}</NotAssessed>}</TD>
                    <TD className="text-ink-2">{x.data_availability ? label("data", x.data_availability) : <NotAssessed>{label("data", "")}</NotAssessed>}</TD>
                    <TD numeric>{pct(x.electrification_rate)}</TD>
                    <TD className={cn(x.has_ndc === "yes" ? "text-ink-2" : "text-muted-foreground")}>{label("yesno", x.has_ndc)}</TD>
                    <TD className={cn(x.has_lts === "yes" ? "text-ink-2" : "text-muted-foreground")}>{label("yesno", x.has_lts)}</TD>
                    <TD numeric><Meter value={x.gap_score} max={100} label={format.number(x.gap_score)} /></TD>
                    <TD numeric>{format.number(x.n_studies)}</TD>
                    <TD lowPriority className="text-ink-2">{label("region", x.region)}</TD>
                    <TD lowPriority className="text-ink-2">{x.power_pool}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Block>

          <Callout className="mt-8 max-w-[46em]">
            {t("caveat")} <Link href="/methodology">{t("methodLink")}</Link>
          </Callout>
        </>
      )}
    </div>
  );
}
