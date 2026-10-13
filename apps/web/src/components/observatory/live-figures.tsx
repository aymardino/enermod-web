"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, type Overview } from "@/lib/api";

/** The live headline figures quoted beside the reading pages: a ruled list under a 2px rule
 *, small-caps title with the rubric "computed live" mark, values in the visitor's
 *  number format, and a text link to the observatory. */
export function LiveFigures() {
  const t = useTranslations("home");
  const td = useTranslations("observatory.dashboard");
  const f = useFormatter();
  const { data } = useQuery<Overview>({ queryKey: ["overview"], queryFn: () => api.get("/stats/overview") });
  if (!data) return null;
  const pct = (v: number) => f.number(v / 100, { style: "percent", maximumFractionDigits: 0 });
  const rows: [string, string][] = [
    [t("kpis.studies"), f.number(data.n_studies)],
    [td("scope.full"), f.number(data.n_full)],
    [td("scope.light"), f.number(data.n_light)],
    [t("kpis.countries"), `${f.number(data.countries_covered)}/${f.number(data.n_countries)}`],
    [t("kpis.tools"), f.number(data.n_tools)],
    [t("kpis.africanLed"), pct(data.origin.african_led_pct)],
    [t("kpis.open"), pct(data.open_pct)],
  ];
  return (
    <section aria-labelledby="live-figures-title" className="border-t-2 border-rule pt-3">
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <h2 id="live-figures-title" className="sc">{t("kpiTitle")}</h2>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 bg-rubric" />
          {t("live")}
        </span>
      </div>
      <dl className="border-t border-rule text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border py-[7px]">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-[15px] font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">{t("kpiNote")}</p>
      <p className="mt-2.5 text-sm">
        <Link href="/observatory" className="link inline-flex min-h-6 items-center gap-1.5 font-medium">
          {t("ctaPrimary")}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
        </Link>
      </p>
    </section>
  );
}
