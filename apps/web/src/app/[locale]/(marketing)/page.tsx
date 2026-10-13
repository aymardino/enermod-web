import type * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PartnerLogos } from "@/components/brand/logo";
import { SingleLineDiagram } from "@/components/marketing/single-line-diagram";
import { Kicker, OBSERVATORY_SECTIONS } from "@/components/observatory/page-head";
import { HeroFigures, HeroHorizon, HeroMap, InventoryTrio, LatestEntries, RecordCount } from "@/components/observatory/home-live";
import { KRINEA_URL, REPO_URL, SITE_URL } from "@/lib/site";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "EnerMod Africa Observatory",
  description: "A living inventory of energy modelling studies and tools applied across the 54 African countries, built from a PRISMA systematic review.",
  url: SITE_URL,
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: { "@type": "Organization", name: "AISESA · MINES Paris-PSL" },
  sameAs: [REPO_URL],
};

const WRAP = "mx-auto w-full max-w-[1248px] px-8 max-md:px-4";
const H2 = "text-balance text-[26px] font-bold leading-[1.15] tracking-[-0.01em] md:text-[32px]";
const SUBLEDE = "mt-3 max-w-[48em] text-[17px] leading-[1.55] text-ink-2";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Home />;
}

/** A home section: a small blue label above the title, full width; `band` paints it light grey so
 *  consecutive sections read apart. */
function HomeSection({ label, band = false, children }: { label?: React.ReactNode; band?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("py-16 max-md:py-11", band ? "border-y border-border bg-muted" : "")}>
      <div className={WRAP}>
        {label && <p className="sc mb-2.5 text-rubric">{label}</p>}
        {children}
      </div>
    </section>
  );
}

function Home() {
  const t = useTranslations("home");
  const nav = useTranslations("nav.obs");
  const questions = [
    { key: "q1", page: "map", href: "/observatory/map", msg: "see" },
    { key: "q2", page: "tools", href: "/observatory/tools", msg: "see" },
    { key: "q3", page: "gaps", href: "/observatory/gaps", msg: "seeWho" },
    { key: "q4", page: "gaps", href: "/observatory/gaps", msg: "see" },
    { key: "q5", page: "readiness", href: "/observatory/readiness", msg: "see" },
  ] as const;
  const contents = [
    ...OBSERVATORY_SECTIONS.filter((s) => ["map", "gaps", "readiness", "studies", "recommender"].includes(s.key)).map((s) => ({
      name: nav(s.key),
      text: t(`story.${s.key as "map" | "gaps" | "readiness" | "studies" | "recommender"}.text`),
      href: s.href,
    })),
    { name: t("story.methodology.title"), text: t("story.methodology.text"), href: "/methodology" },
  ];
  const nodeLink = (href: string, text: string) => (
    <Link href={href} className="link inline-block py-[3px]">{text}</Link>
  );
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Title page: kicker, full-width headline, Fig. 1 plate | commentary, Fig. 1b data horizon */}
      <section className="border-b border-border">
        <div className={cn(WRAP, "pb-14 pt-14 max-md:pb-10 max-md:pt-8")}>
          <Kicker>{t("eyebrow")}</Kicker>
          <h1 className="mt-4 max-w-[22em] text-balance text-[34px] font-bold leading-[1.1] tracking-[-0.015em] md:text-[44px] lg:text-[52px]">
            {t("titleStatement")} <span className="block text-balance font-semibold text-brand-700">{t("titleQuestion")}</span>
          </h1>
          <div className="mt-10 grid grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] grid-rows-[auto_1fr] gap-x-14 [grid-template-areas:'map_a'_'map_b'] max-lg:grid-cols-[minmax(0,1fr)] max-lg:grid-rows-none max-lg:gap-x-0 max-lg:[grid-template-areas:'a'_'map'_'b'] max-md:mt-[26px] max-md:pt-5">
            <div className="min-w-0 [grid-area:a]">
              <p className="text-[18px] leading-[1.6] text-ink-2 md:text-[19px]">{t("lede")}</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-[22px] gap-y-2 max-md:flex-col max-md:items-stretch max-md:gap-y-1">
                <Button size="lg" asChild>
                  <Link href="/observatory">
                    {t("ctaPrimary")}
                    <ArrowRight strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/observatory/recommender">{t("ctaText")}</Link>
                </Button>
              </div>
            </div>
            <HeroMap className="[grid-area:map] max-lg:mt-[30px] max-lg:max-w-[620px] max-md:mt-[26px]" />
            <HeroFigures className="mt-[34px] [grid-area:b]" />
          </div>
          <HeroHorizon />
        </div>
      </section>

      <HomeSection label={t("sec.questions")} band>
        <h2 className={H2}>{t("questionsTitle")}</h2>
        <ul className="mt-8 grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {questions.map((q) => (
            <li key={q.key} className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-5 shadow-card">
              <p className="text-[18px] font-semibold leading-[1.35]">{t(`questions.${q.key}`)}</p>
              <p className="text-[14px] text-muted-foreground">
                {t.rich(q.msg, { page: nav(q.page), link: (chunks) => <Link href={q.href} className="link font-semibold">{chunks}</Link> })}
              </p>
            </li>
          ))}
        </ul>
      </HomeSection>

      <HomeSection label={t("sec.inventory")}>
        <h2 className={H2}>{t("inventoryTitle")}</h2>
        <p className={SUBLEDE}>{t("scopeText")}</p>
        <InventoryTrio />
      </HomeSection>

      <HomeSection band>
        <LatestEntries />
      </HomeSection>

      <HomeSection label={t("sec.contents")}>
        <h2 className={H2}>{t("storyTitle")}</h2>
        <p className={SUBLEDE}>{t("storyLede")}</p>
        <ul className="mt-8 grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
          {contents.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-5 no-underline shadow-card hover:border-brand-300 hover:bg-accent"
              >
                <span className="flex items-center justify-between gap-3 text-[18px] font-bold text-brand-700">
                  {r.name}
                  <ArrowRight aria-hidden="true" className="size-[18px] shrink-0 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="text-[15px] leading-[1.5] text-ink-2">{r.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </HomeSection>

      <HomeSection label={t("sec.living")} band>
        <h2 className={H2}>{t("living.title")}</h2>
        <SingleLineDiagram
          className="mt-9"
          ariaLabel={t("living.aria")}
          feeders={[
            { label: t("living.feeder", { n: 1 }), title: t("living.f1Title"), description: t("living.f1Text"), link: nodeLink("/contribute", t("living.f1Link")) },
            {
              label: t("living.feeder", { n: 2 }),
              title: t("living.f2Title"),
              description: t.rich("living.f2Text", { krinea: (chunks) => <a href={KRINEA_URL} target="_blank" rel="noreferrer" className="link">{chunks}</a> }),
              link: nodeLink("/research", t("living.f2Link")),
            },
          ]}
          bus={{ name: t("living.busName"), note: t("living.busNote"), meta: <RecordCount /> }}
          outputs={[
            { label: t("living.output", { n: 1 }), title: t("living.o1Title"), description: t("living.o1Text"), link: nodeLink("/observatory", t("living.o1Link")) },
            { label: t("living.output", { n: 2 }), title: t("living.o2Title"), description: t("living.o2Text"), link: nodeLink("/research#data", t("living.o2Link")) },
          ]}
        />
      </HomeSection>

      <HomeSection label={t("sec.deliveredBy")}>
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-x-12 gap-y-6 max-lg:grid-cols-[minmax(0,1fr)]">
          <div>
            <h2 className="text-[24px] font-bold leading-[1.2]">{t("partnersTitle")}</h2>
            <p className="mt-3 text-[17px] leading-[1.55] text-ink-2">{t("partnersText")}</p>
          </div>
          <PartnerLogos height={52} className="justify-end gap-x-[30px] max-lg:justify-start" />
        </div>
      </HomeSection>
    </>
  );
}
