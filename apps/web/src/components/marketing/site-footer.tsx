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

const linkClass =
  "block py-[5px] text-[14.5px] leading-[1.45] text-white/80 no-underline hover:text-white hover:underline hover:underline-offset-3";

/** Footer: the sand endpaper opened by the neatline. Brand column (lockup, tagline, institutions,
 *  partner logos at 44px), then Explore, Project, Data and legal under small caps over 1px ink rules;
 *  the colophon row closes it with the licences, the type and map credits and "English / Français".
 *  `wide` matches the observatory's 1400px container at 2xl. */
export function SiteFooter({ wide = false }: { wide?: boolean }) {
  const t = useTranslations("nav");
  const c = useTranslations("common");
  const year = new Date().getFullYear();
  const wrap = wide
    ? "mx-auto w-full max-w-[1248px] px-8 max-md:px-4 2xl:max-w-[1400px]"
    : "mx-auto w-full max-w-[1248px] px-8 max-md:px-4";
  return (
    <footer className="bg-brand-900 text-white">
      <div className={cn(wrap, "grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] gap-10 pb-10 pt-12 max-lg:grid-cols-2 max-md:gap-x-5 max-md:gap-y-8 max-md:pt-9")}>
        <div className="min-w-0 max-md:col-span-2">
          <Link href="/" aria-label={t("home")} className="inline-flex max-w-full no-underline">
            <EnermodWordmark size={34} className="[&_span]:!text-white" />
          </Link>
          <p className="mt-[18px] max-w-[24em] text-[17px] leading-[1.45] text-white">{c("tagline")}</p>
          <p className="mt-3 max-w-[32em] text-[13px] leading-[1.5] text-white/70">{t("footer.institutions")}</p>
          <div className="mt-[22px] inline-flex rounded-lg bg-white px-4 py-3">
            <PartnerLogos height={40} />
          </div>
        </div>
        {GROUPS.map((g) => (
          <div key={g.key} className="min-w-0">
            <h2 className="sc border-b border-white/20 pb-2.5 text-white">{t(`footer.${g.key}`)}</h2>
            <ul className="mt-2">
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
      <div className={wrap}>
        {/* the bottom padding clears the fixed "Ask the observatory" button */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1.5 border-t border-white/20 pb-[84px] pt-4 text-[13px] leading-[1.5] text-white/70 max-md:grid-cols-1 max-md:gap-y-2.5">
          <p>{t("footer.copyright", { year })} · {t("footer.licence")}</p>
          <p className="text-[13px] leading-[1.4]">{t("footer.colophon")}</p>
          <LanguageSwitch long className="-mx-1 justify-self-start md:col-start-2 md:row-span-2 md:row-start-1 [&_a]:!text-white/80 [&_a:hover]:!text-white [&_a[aria-current]]:!text-white [&_a[aria-current]]:!decoration-white [&_span]:!text-white/40" />
        </div>
      </div>
    </footer>
  );
}
