import type * as React from "react";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ArrowRight, BarChart3, BookOpen, Compass, Database, Gauge, Map, RefreshCw, Users, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PartnerLogos } from "@/components/brand/logo";
import { HeroHorizon, HeroMap, HeroStats, InventoryTrio, LatestEntries } from "@/components/observatory/home-live";
import { REPO_URL, SITE_URL } from "@/lib/site";

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
const H2 = "text-balance text-[28px] font-bold leading-[1.2] md:text-[34px]";
const LEDE = "mt-3 max-w-[48em] text-[17px] leading-[1.6] text-ink-2";
const CARD = "rounded-xl border border-border bg-card shadow-card";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Home />;
}

/** A home section: white or light grey band, title block with an accent bar. */
function Section({ title, lede, grey = false, action, children }: {
  title?: React.ReactNode;
  lede?: React.ReactNode;
  grey?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("py-16 max-md:py-12", grey ? "bg-muted" : "bg-background")}>
      <div className={WRAP}>
        {title && (
          <div className="mb-9 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 max-md:mb-7">
            <div className="min-w-0">
              <h2 className={H2}>{title}</h2>
              <span aria-hidden="true" className="mt-4 block h-1 w-14 rounded-full bg-primary" />
              {lede && <p className={LEDE}>{lede}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

function Home() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const explore = [
    { icon: Map, title: nav("obs.map"), text: t("questions.q1"), href: "/observatory/map" },
    { icon: BarChart3, title: nav("obs.gaps"), text: t("questions.q4"), href: "/observatory/gaps" },
    { icon: Gauge, title: nav("obs.readiness"), text: t("questions.q5"), href: "/observatory/readiness" },
    { icon: BookOpen, title: nav("obs.studies"), text: t("story.studies.text"), href: "/observatory/studies" },
    { icon: Wrench, title: nav("obs.tools"), text: t("questions.q2"), href: "/observatory/tools" },
    { icon: Compass, title: nav("obs.recommender"), text: t("story.recommender.text"), href: "/observatory/recommender" },
  ];
  const how = [
    { icon: Users, title: t("hub.contribute.title"), text: t("hub.contribute.text"), cta: t("hub.contribute.cta"), href: "/contribute" },
    { icon: RefreshCw, title: t("hub.discovery.title"), text: t("hub.discovery.text"), cta: t("hub.discovery.cta"), href: "/research" },
    { icon: Database, title: t("hub.data.title"), text: t("hub.data.text"), cta: t("hub.data.cta"), href: "/research#data" },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Hero: full-width green band, message and actions on the left, the live map on the right */}
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(90%_120%_at_100%_0%,var(--brand-700)_0%,transparent_65%),radial-gradient(60%_80%_at_0%_100%,var(--brand-800)_0%,transparent_70%)]" />
        <div className={cn(WRAP, "grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-center gap-14 pb-28 pt-16 max-lg:grid-cols-1 max-lg:gap-10 max-md:pb-24 max-md:pt-10")}>
          <div className="min-w-0">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-brand-200">{t("eyebrow")}</p>
            <h1 className="mt-4 text-balance text-[36px] font-bold leading-[1.1] md:text-[50px]">
              {t("titleStatement")} <span className="block text-brand-200">{t("titleQuestion")}</span>
            </h1>
            <p className="mt-6 max-w-[34em] text-[18px] leading-[1.6] text-white/85">{t("lede")}</p>
            <div className="mt-8 flex flex-wrap gap-3 max-md:flex-col">
              <Button size="lg" className="bg-white text-brand-800 hover:bg-brand-50" asChild>
                <Link href="/observatory">
                  {t("ctaPrimary")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/70 bg-transparent text-white hover:bg-white/10" asChild>
                <Link href="/observatory/recommender">{t("ctaSecondary")}</Link>
              </Button>
            </div>
            <p className="mt-6 text-[14px] leading-[1.5] text-white/70">{t("trust")}</p>
          </div>
          <div className="min-w-0 rounded-xl bg-white p-5 text-foreground shadow-[0_24px_48px_-16px_rgb(0_0_0/0.45)] max-md:p-3">
            <HeroMap compact />
          </div>
        </div>
      </section>

      {/* Key figures, overlapping the hero */}
      <div className={cn(WRAP, "relative z-10 -mt-16")}>
        <HeroStats />
      </div>

      <Section title={t("questionsTitle")} lede={t("storyLede")}>
        <ul className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-md:grid-cols-1">
          {explore.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className={cn(CARD, "group flex h-full flex-col p-6 no-underline transition-shadow hover:border-brand-300 hover:shadow-[0_8px_24px_-8px_rgb(16_24_40/0.2)]")}>
                <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700 group-hover:bg-brand-700 group-hover:text-white">
                  <e.icon className="size-6" />
                </span>
                <span className="mt-5 text-[20px] font-bold text-foreground">{e.title}</span>
                <span className="mt-2 flex-1 text-[15.5px] leading-[1.55] text-ink-2">{e.text}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary">
                  {t("open")}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section grey title={t("trendTitle")} lede={t("trendLede")}>
        <div className={cn(CARD, "p-6 max-md:p-4")}>
          <HeroHorizon bare />
        </div>
      </Section>

      <Section title={t("inventoryTitle")} lede={t("scopeText")}>
        <div className={cn(CARD, "p-6 max-md:p-4 [&>*:first-child]:mt-0")}>
          <InventoryTrio />
        </div>
      </Section>

      <Section grey>
        <LatestEntries />
      </Section>

      <Section title={t("living.title")}>
        <ul className="grid grid-cols-3 gap-6 max-lg:grid-cols-1">
          {how.map((h) => (
            <li key={h.title} className={cn(CARD, "flex flex-col p-6")}>
              <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
                <h.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-[20px] font-bold">{h.title}</h3>
              <p className="mt-2 flex-1 text-[15.5px] leading-[1.55] text-ink-2">
                {h.text}
              </p>
              <Link href={h.href} className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary no-underline hover:underline">
                {h.cta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <section className="border-t border-border bg-muted py-16 max-md:py-12">
        <div className={cn(WRAP, "grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-x-14 gap-y-10 max-lg:grid-cols-1")}>
          <div className="min-w-0">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-primary">{t("sec.deliveredBy")}</p>
            <h2 className="mt-2 text-[26px] font-bold leading-[1.25]">{t("partnersTitle")}</h2>
            <span aria-hidden="true" className="mt-4 block h-1 w-14 rounded-full bg-primary" />
            <p className="mt-5 text-[16.5px] leading-[1.6] text-ink-2">{t("partnersText")}</p>
            <div className="mt-7 inline-flex rounded-xl border border-border bg-white px-6 py-5">
              <PartnerLogos height={48} className="gap-x-8" />
            </div>
          </div>
          <figure className="min-w-0">
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl shadow-[0_16px_40px_-16px_rgb(16_24_40/0.35)]">
              <Image
                src="/images/aisesa-congress-group.jpg"
                alt={t("partnersPhotoAlt")}
                fill
                sizes="(min-width: 1024px) 620px, 100vw"
                className="object-cover"
                style={{ objectPosition: "center 70%" }}
              />
            </div>
            <figcaption className="mt-2.5 text-[13.5px] text-muted-foreground">{t("partnersPhotoCredit")}</figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}
