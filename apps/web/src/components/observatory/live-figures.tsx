"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api, type Overview } from "@/lib/api";
import { Button } from "@/components/ui/button";

/** Side panel with the live headline figures (reading pages quote them). */
export function LiveFigures() {
  const t = useTranslations("home");
  const c = useTranslations("common");
  const { data } = useQuery<Overview>({ queryKey: ["overview"], queryFn: () => api.get("/stats/overview") });
  if (!data) return null;
  const rows = [
    [t("kpis.studies"), data.n_studies.toLocaleString()], [c("full"), data.n_full], [c("light"), data.n_light],
    [t("kpis.countries"), `${data.countries_covered}/${data.n_countries}`], [t("kpis.tools"), data.n_tools],
    [t("kpis.africanLed"), `${data.origin.african_led_pct}%`], [t("kpis.open"), `${data.open_pct}%`],
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("kpiTitle")}</p>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([k, v]) => <div key={String(k)} className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="tabular font-semibold">{v}</dd></div>)}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{t("kpiNote")}</p>
      <Button variant="outline" size="sm" className="mt-3 w-full" asChild><Link href="/observatory">{t("ctaPrimary")}</Link></Button>
    </div>
  );
}
