"use client";

import { useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, qs, type Gaps, type Overview } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { NotAssessed } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { IsoCode, Meter, Table, TBody, TD, TH, THead, TR, countryLinkClass } from "@/components/ui/table";
import { AfricaMap, WorldOriginMap } from "@/components/observatory/africa-map";
import { Columns, CoverageBars, OriginBar } from "@/components/observatory/charts";
import { ChipGroup, LevelFilter } from "@/components/observatory/filters";
import { Callout, Caption, Kpi, KpiStrip } from "@/components/observatory/kpi";
import { Block, PageHead } from "@/components/observatory/page-head";
import { countryInfo } from "@/components/observatory/study-card";

/** Page container of the observatory: 1248px, 1400px from 2xl, 32px gutters (16px on phones). */
const WRAP = "mx-auto w-full max-w-[1248px] px-8 pb-[72px] pt-10 max-md:px-4 2xl:max-w-[1400px]";
/** Two ruled blocks side by side, one column below 1024px. */
const PAIR = "grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-12 max-lg:grid-cols-[minmax(0,1fr)]";

/** Country names in the reader's language. English keeps the inventory's names; French takes the
 *  54 from the shared country list and any other country from Intl.DisplayNames. */
function useCountryName() {
  const locale = useLocale();
  return useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      names = null;
    }
    return (iso2: string | undefined, fallback: string) => {
      if (!iso2 || locale === "en") return fallback;
      const info = countryInfo(iso2, locale);
      if (info.pool || info.iso3 !== iso2) return info.name;
      try {
        return names?.of(iso2.toUpperCase()) ?? fallback;
      } catch {
        return fallback;
      }
    };
  }, [locale]);
}

export default function GapsPage() {
  const t = useTranslations("observatory.gaps");
  const c = useTranslations("common");
  const u = useTranslations("ui.chart");
  const label = useLabel();
  const locale = useLocale();
  const format = useFormatter();
  const nameOf = useCountryName();
  const [level, setLevel] = useState<"full" | "light" | "all">("full");
  const [regions, setRegions] = useState<string[]>([]);
  const ov = useQuery<Overview>({ queryKey: ["overview"], queryFn: () => api.get("/stats/overview") });
  // the previous figures stay on screen while a new scope or region loads, so the filters never unmount
  const g = useQuery<Gaps>({ queryKey: ["gaps", level, regions], queryFn: () => api.get(`/stats/gaps${qs({ level, region: regions })}`), placeholderData: (prev) => prev });
  const d = g.data;
  const pct = (v: number) => format.number(v / 100, { style: "percent", maximumFractionDigits: 0 });
  const originLabels = { african_led: label("origin", "african_led"), mixed: label("origin", "mixed"), non_african: label("origin", "non_african") };

  return (
    <div className={WRAP}>
      <PageHead
        section="gaps"
        title={t("title")}
        lede={t("lede")}
        className="max-lg:grid-cols-[minmax(0,1fr)]"
        aside={
          <div className="min-w-0">
            <LevelFilter
              value={level}
              onChange={setLevel}
              hideHelp
              counts={{ full: ov.data?.n_full ?? 0, light: ov.data?.n_light ?? 0 }}
              labels={{ title: t("scope"), full: label("level", "full"), light: label("level", "light"), all: c("all") }}
            />
            <p className="mt-3 max-w-[25rem] text-[12.5px] leading-[1.45] text-muted-foreground">{level === "all" ? t("scopeAllHelp") : t("scopeHelp")}</p>
          </div>
        }
      />

      {/* the region filter scopes both maps and the table; the coverage figures follow the scope only */}
      <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-3">
        <ChipGroup
          label={t("region")}
          value={regions}
          onChange={setRegions}
          options={(ov.data?.regions ?? []).map((r) => ({ value: r, label: label("region", r) }))}
        />
        <p className="max-w-[30em] pb-1.5 text-[12.5px] leading-[1.45] text-muted-foreground">{t("regionHint")}</p>
      </div>

      {!d ? (
        <div className={cn(PAIR, "mt-11")}>
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className={cn(g.isPlaceholderData && "opacity-60")} aria-busy={g.isFetching}>
          <div className={cn(PAIR, "mt-11")}>
            <Block title={t("featuresTitle")} description={t("featuresLede", { n: d.n_studies })}>
              <figure>
                <CoverageBars
                  rows={d.features.map((f) => ({ label: label("feature", f.key), pct: f.pct, positive: f.positive, assessed: f.assessed }))}
                  median={d.feature_median}
                  ariaLabel={t("featuresTitle")}
                />
                <Caption fig={1}>{t("featuresCaption")}</Caption>
              </figure>
            </Block>
            <Block title={t("emergingTitle")} description={t("emergingLede")}>
              <KpiStrip cols={2}>
                <Kpi
                  label={t("agenda")}
                  value={`${format.number(d.emerging.agenda_2063.positive)} / ${format.number(d.emerging.agenda_2063.assessed)}`}
                  hint={t("ofAssessed", { p: d.emerging.agenda_2063.pct })}
                />
                <Kpi
                  label={t("grey")}
                  value={`${format.number(d.emerging.grey_literature.positive)} / ${format.number(d.emerging.grey_literature.assessed)}`}
                  hint={t("ofAssessed", { p: d.emerging.grey_literature.pct })}
                />
              </KpiStrip>
            </Block>
          </div>

          {/* authorship: malachite and violet live here, never with the readiness ramp */}
          <div className="mt-12 grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-12 max-lg:grid-cols-[minmax(0,1fr)]">
            <Block title={t("whoTitle")} description={t("whoLede")}>
              <figure>
                <OriginBar origin={d.origin} labels={originLabels} />
                <Caption fig={2}>{t("whoCaption", { n: d.origin.assessed })}</Caption>
              </figure>
              <Callout tone="brand" className="mt-6">
                {t("method")} <Link href="/methodology">{t("methodLink")}</Link>
              </Callout>
            </Block>
            <Block title={t("whereTitle")}>
              <WorldOriginMap
                rows={d.origin_map.map((r) => ({ ...r, name: nameOf(r.iso2, r.name) }))}
                labels={{ africa: t("mapAfrica"), outside: t("mapOutside"), studies: c("studies") }}
                ariaLabel={t("whereTitle")}
                fig={3}
                caption={t("whereCaption", { n: d.n_map_studies })}
              />
            </Block>
          </div>

          <Block className="mt-12" title={t("gapMapTitle")} description={t("gapMapLede")}>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-12 max-xl:grid-cols-[minmax(0,1fr)]">
              <AfricaMap
                data={d.gap_map.map((x) => ({
                  iso3: x.iso3,
                  value: x.gap_score,
                  label: nameOf(x.iso2, x.name),
                  hint: u("nStudies", { n: x.n_studies }),
                  href: `/observatory/countries/${x.iso2}`,
                }))}
                metric="gap"
                legendTitle={t("gapScore")}
                zeroLabel={t("outsideRegion")}
                formatValue={(v) => `${t("gapScore")} ${format.number(v)}`}
                ariaLabel={t("gapMapTitle")}
                fig={4}
                caption={t("gapMapCaption")}
                className="max-xl:mx-auto max-xl:w-full max-xl:max-w-[620px]"
              />
              <div className="min-w-0">
                <Table stickyFirst>
                  <THead>
                    <TR>
                      <TH>{c("country")}</TH>
                      <TH numeric>{c("studies")}</TH>
                      <TH numeric sort="descending" className="whitespace-normal">{t("gapScore")}</TH>
                      <TH>{t("data")}</TH>
                      <TH>{t("governance")}</TH>
                      <TH numeric>{t("elec")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {d.top_gap.map((x) => (
                      <TR key={x.iso2}>
                        <TD className="lg:whitespace-normal">
                          <span className="flex items-baseline">
                            <IsoCode>{countryInfo(x.iso2, locale).iso3}</IsoCode>
                            <Link href={`/observatory/countries/${x.iso2}`} className={countryLinkClass}>{nameOf(x.iso2, x.name)}</Link>
                          </span>
                        </TD>
                        <TD numeric>{format.number(x.n_studies)}</TD>
                        <TD numeric><Meter value={x.gap_score} max={100} label={format.number(x.gap_score)} /></TD>
                        <TD className="text-ink-2">{x.data_availability ? label("data", x.data_availability) : <NotAssessed>{label("data", "")}</NotAssessed>}</TD>
                        <TD className="text-ink-2">{x.energy_governance ? label("governance", x.energy_governance) : <NotAssessed>{label("governance", "")}</NotAssessed>}</TD>
                        <TD numeric>{pct(x.electrification_rate)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <p className="mt-2.5 text-[12.5px] leading-[1.45] text-muted-foreground">{t("gapTableCaption")}</p>
              </div>
            </div>
          </Block>

          <Block className="mt-12" title={t("financeTitle")} description={t("financeLede")}>
            <KpiStrip>
              <Kpi label={t("modeRate")} value={pct(d.financing.mode_rate)} hint={t("modeRateHint", { share: d.financing.mode_share, n: d.financing.n_rates })} />
              <Kpi label={t("varied")} value={format.number(d.financing.n_varied)} hint={t("variedHint")} />
              <Kpi label={t("financingModelled")} value={pct(d.financing.financing_pct)} hint={t("financingHint", { p: d.financing.financing_positive, n: d.financing.financing_assessed })} />
              <Kpi label={t("unstated")} value={format.number(d.financing.n_not_stated)} hint={t("unstatedHint", { m: d.financing.n_mechanisms })} />
            </KpiStrip>
            {d.financing.rate_distribution.length > 1 && (
              <figure className="mt-8 grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-end gap-x-12 max-lg:grid-cols-[minmax(0,1fr)]">
                <Columns rows={d.financing.rate_distribution.map((r) => ({ label: `${r.rate}`, value: r.studies }))} unit="%" height={200} ariaLabel={t("rateCaption")} />
                <Caption fig={5} className="max-w-[30em] lg:mb-6">{t("rateCaption")}</Caption>
              </figure>
            )}
          </Block>
        </div>
      )}
    </div>
  );
}
