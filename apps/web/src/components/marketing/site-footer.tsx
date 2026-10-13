"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EnermodWordmark, PartnerLogos } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/marketing/language-switch";
import { KRINEA_URL, LEGACY_REPO_URL, REPO_URL } from "@/lib/site";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

const linkClass = "block py-1 text-[15px] leading-[1.5] text-white/75 no-underline hover:text-white hover:underline hover:underline-offset-3";

/** Footer, institutional layout: a deep green band with the link columns (bold white headings),
 *  then a darker band with the institution, the partner logos, the licences and the language. */
export function SiteFooter({ wide = false }: { wide?: boolean }) {
  const t = useTranslations("nav");
  const c = useTranslations("common");
  const year = new Date().getFullYear();
  const wrap = wide
    ? "mx-auto w-full max-w-[1800px] px-6 lg:px-12 max-md:px-4"
    : "mx-auto w-full max-w-[1800px] px-6 lg:px-12 max-md:px-4";
  return (
    <footer className="text-white">
      <div className="bg-brand-900">
        <div className={cn(wrap, "grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-10 py-14 max-lg:grid-cols-2 max-md:gap-x-5 max-md:gap-y-9 max-md:py-10")}>
          <div className="min-w-0 max-md:col-span-2">
            <Link href="/" aria-label={t("home")} className="inline-flex max-w-full no-underline">
              <EnermodWordmark size={34} inverse />
            </Link>
            <p className="mt-5 max-w-[24em] text-[16px] leading-[1.55] text-white/90">{c("tagline")}</p>
            <Link href="/contribute" className="mt-6 inline-flex h-11 items-center rounded-md bg-white px-5 text-[15px] font-medium text-brand-800 no-underline hover:bg-brand-50">
              {t("contribute")}
            </Link>
          </div>
          {GROUPS.map((g) => (
            <div key={g.key} className="min-w-0">
              <h2 className="text-[18px] font-bold text-white">{t(`footer.${g.key}`)}</h2>
              <ul className="mt-3.5 space-y-1">
                {g.links.map((l) => (
                  <li key={l.key}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className={linkClass}>{t(l.key)}</a>
                    ) : (
                      <Link href={l.href} className={linkClass}>{t(l.key)}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-brand-950">
        {/* the bottom padding clears the fixed "Ask the observatory" button */}
        <div className={cn(wrap, "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-10 gap-y-6 pb-24 pt-10 max-lg:grid-cols-1 max-md:pt-8")}>
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-white">AISESA · MINES Paris-PSL · The Transition Institute 1.5</p>
            <p className="mt-2 max-w-[44em] text-[14.5px] leading-[1.55] text-white/75">{t("footer.institutions")}</p>
            <p className="mt-4 text-[13.5px] leading-[1.6] text-white/60">
              {t("footer.copyright", { year })} · {t("footer.licence")}
              <br />
              {t("footer.colophon")}
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div className="inline-flex rounded-md bg-white px-4 py-3">
              <PartnerLogos height={40} />
            </div>
            <LanguageSwitch long className="-mx-1 [&_a]:!text-white/75 [&_a:hover]:!text-white [&_a[aria-current]]:!text-white [&_a[aria-current]]:!decoration-white [&_span]:!text-white/40" />
          </div>
        </div>
      </div>
    </footer>
  );
}
