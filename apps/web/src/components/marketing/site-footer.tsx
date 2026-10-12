"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EnermodWordmark, PartnerLogos } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/marketing/site-header";
import { KRINEA_URL, LEGACY_REPO_URL, REPO_URL } from "@/lib/site";
import { api } from "@/lib/api";

type FooterLink = { key: string; href: string; external?: boolean };
const GROUPS: { key: "explore" | "project" | "data"; links: FooterLink[] }[] = [
  { key: "explore", links: [
    { key: "obs.dashboard", href: "/observatory" }, { key: "obs.map", href: "/observatory/map" }, { key: "obs.gaps", href: "/observatory/gaps" },
    { key: "obs.readiness", href: "/observatory/readiness" }, { key: "obs.studies", href: "/observatory/studies" },
    { key: "obs.tools", href: "/observatory/tools" }, { key: "obs.recommender", href: "/observatory/recommender" },
  ] },
  { key: "project", links: [
    { key: "about", href: "/about" }, { key: "methodology", href: "/methodology" }, { key: "research", href: "/research" },
    { key: "contribute", href: "/contribute" }, { key: "contact", href: "/contact" }, { key: "github", href: REPO_URL, external: true },
    { key: "legacy", href: LEGACY_REPO_URL, external: true },
  ] },
  { key: "data", links: [
    { key: "footer.downloadStudies", href: api.url("/export/studies.csv"), external: true },
    { key: "footer.downloadAll", href: api.url("/export/all.zip"), external: true },
    { key: "footer.krinea", href: KRINEA_URL, external: true },
    { key: "footer.privacy", href: "/privacy" }, { key: "footer.legalNotice", href: "/legal" },
  ] },
];

export function SiteFooter() {
  const t = useTranslations("nav");
  const c = useTranslations("common");
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-sand-100/70 dark:bg-muted/40">
      <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <EnermodWordmark size={32} />
            <p className="max-w-xs text-sm text-muted-foreground">{c("tagline")}</p>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{t("footer.institutions")}</p>
            <PartnerLogos />
            <LanguageSwitch />
          </div>
          {GROUPS.map((g) => (
            <div key={g.key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{t(`footer.${g.key}`)}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {g.links.map((l) => (
                  <li key={l.key}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="hover:text-foreground">{t(l.key)}</a>
                    ) : (
                      <Link href={l.href} className="hover:text-foreground">{t(l.key)}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright", { year })}</p>
          <p>{t("footer.licence")}</p>
        </div>
      </div>
    </footer>
  );
}
