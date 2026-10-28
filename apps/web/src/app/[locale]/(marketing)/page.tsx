import type * as React from "react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PartnerLogos } from "@/components/brand/logo";
import { HeroStats, HomeOrigin, HomeTrend, LatestEntries } from "@/components/observatory/home-live";
import { SECTION_PHOTO } from "@/components/observatory/page-head";
import { PHOTOS, photoAlt, photoCredit } from "@/data/photos";
import { AISESA_URL, DOI, REPO_URL, SITE_URL, TTI_URL, localePath } from "@/lib/site";

const WRAP = "mx-auto w-full max-w-[1800px] px-6 lg:px-12 max-md:px-4";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const seo = await getTranslations({ locale, namespace: "seo" });
  // structured data for search engines, in the page's language
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "EnerMod Africa Observatory",
    description: seo("description"),
    inLanguage: locale,
    url: SITE_URL + localePath(locale, ""),
    license: "https://creativecommons.org/licenses/by/4.0/",
    identifier: `https://doi.org/${DOI}`,
    publisher: { "@type": "Organization", name: "AISESA", url: AISESA_URL },
    creator: [
      { "@type": "Organization", name: "AISESA", url: AISESA_URL },
      { "@type": "Organization", name: "MINES Paris-PSL", url: TTI_URL },
    ],
    sameAs: [REPO_URL],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Home />
    </>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-10 max-md:mb-7">
      <h2 className="text-balance text-[30px] font-bold leading-[1.2] md:text-[36px]">{children}</h2>
      <span aria-hidden="true" className="mt-4 block h-1 w-14 rounded-full bg-primary" />
    </div>
  );
}

function Home() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const locale = useLocale();
  const hero = "hero-noor-ouarzazate" as const;
  const cards = (["map", "gaps", "readiness", "studies", "tools", "recommender"] as const).map((key) => ({
    key,
    title: nav(`obs.${key}`),
    text: t(`cards.${key}`),
    href: `/observatory/${key}`,
    photo: SECTION_PHOTO[key],
  }));
  return (
    <>
      {/* Hero: full-width photo, message and actions on the left */}
      <section className="relative isolate overflow-hidden bg-brand-950 text-white">
        <Image src={PHOTOS[hero].src} alt={photoAlt(hero, locale)} fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: PHOTOS[hero].position }} />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(8_33_19/0.92)_0%,rgb(12_47_27/0.78)_42%,rgb(12_47_27/0.15)_100%)] max-md:bg-[rgb(8_33_19/0.8)]" />
        <div className={cn(WRAP, "flex min-h-[600px] items-center py-20 max-md:min-h-0 max-md:py-14")}>
          <div className="max-w-[720px]">
            <h1 className="text-balance text-[40px] font-bold leading-[1.08] md:text-[60px]">{t("title")}</h1>
            <p className="mt-5 max-w-[36em] text-[19px] leading-[1.5] text-brand-50 md:text-[21px]">{t("lede")}</p>
            <div className="mt-9 flex flex-wrap gap-3 max-md:flex-col">
              <Button size="lg" className="bg-white text-brand-800 hover:bg-brand-50" asChild>
                <Link href="/observatory">
                  {t("ctaPrimary")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/80 bg-transparent text-white hover:bg-white/10" asChild>
                <Link href="/observatory/recommender">{t("ctaSecondary")}</Link>
              </Button>
            </div>
          </div>
        </div>
        <a href={PHOTOS[hero].source} target="_blank" rel="noreferrer" className="absolute bottom-2 right-3 text-[11.5px] text-white/70 no-underline hover:text-white hover:underline">
          {photoCredit(hero, locale)}
        </a>
      </section>

      {/* Key figures */}
      <section className="border-b border-border bg-background py-12 max-md:py-10">
        <div className={WRAP}>
          <HeroStats />
        </div>
      </section>

      {/* Who models Africa's energy future */}
      <section className="py-20 max-md:py-12">
        <div className={WRAP}>
          <HomeOrigin />
        </div>
      </section>

      {/* Explore: photo cards */}
      <section className="bg-muted py-20 max-md:py-12">
        <div className={WRAP}>
          <Title>{t("exploreTitle")}</Title>
          <ul className="grid grid-cols-3 gap-7 max-lg:grid-cols-2 max-md:grid-cols-1">
            {cards.map((c) => (
              <li key={c.key}>
                <Link href={c.href} className="group flex h-full flex-col overflow-hidden rounded-xl bg-card no-underline shadow-[0_1px_3px_rgb(16_24_40/0.08)] transition-shadow hover:shadow-[0_12px_28px_-10px_rgb(16_24_40/0.3)]">
                  <span className="relative block aspect-[16/9] overflow-hidden">
                    <Image
                      src={PHOTOS[c.photo].src}
                      alt={photoAlt(c.photo, locale)}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{ objectPosition: PHOTOS[c.photo].position }}
                    />
                  </span>
                  <span className="flex flex-1 flex-col p-6">
                    <span className="text-[21px] font-bold text-foreground group-hover:text-primary">{c.title}</span>
                    <span className="mt-2 flex-1 text-[16px] leading-[1.55] text-ink-2">{c.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Publication trend */}
      <section className="py-20 max-md:py-12">
        <div className={WRAP}>
          <HomeTrend />
        </div>
      </section>

      {/* Latest studies */}
      <section className="bg-muted py-20 max-md:py-12">
        <div className={WRAP}>
          <LatestEntries />
        </div>
      </section>

      {/* Partners */}
      <section className="py-20 max-md:py-12">
        <div className={cn(WRAP, "grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-x-16 gap-y-10 max-lg:grid-cols-1")}>
          <div className="min-w-0">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-primary">{t("sec.deliveredBy")}</p>
            <h2 className="mt-2 text-[28px] font-bold leading-[1.25]">{t("partnersTitle")}</h2>
            <span aria-hidden="true" className="mt-4 block h-1 w-14 rounded-full bg-primary" />
            <p className="mt-5 text-[17px] leading-[1.6] text-ink-2">{t("partnersText")}</p>
            <div className="mt-8">
              <PartnerLogos height={52} className="gap-x-10" />
            </div>
          </div>
          <figure className="min-w-0">
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl">
              <Image
                src={PHOTOS["aisesa-congress-group"].src}
                alt={photoAlt("aisesa-congress-group", locale)}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                style={{ objectPosition: "center 70%" }}
              />
            </div>
            <figcaption className="mt-2.5 text-[14px] text-muted-foreground">{t("partnersPhotoCredit")}</figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}
