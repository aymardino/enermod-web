import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ArrowRight, BarChart3, BookOpen, Compass, Database, FileSearch, Gauge, Map as MapIcon, Search, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PartnerLogos } from "@/components/brand/logo";
import { HomeLive } from "@/components/observatory/home-live";
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

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Home />;
}

function Home() {
  const t = useTranslations("home");
  const nav = useTranslations("nav.obs");
  const steps = [
    { key: "map", href: "/observatory/map", icon: <MapIcon /> },
    { key: "gaps", href: "/observatory/gaps", icon: <BarChart3 /> },
    { key: "readiness", href: "/observatory/readiness", icon: <Gauge /> },
    { key: "studies", href: "/observatory/studies", icon: <Search /> },
    { key: "recommender", href: "/observatory/recommender", icon: <BookOpen /> },
    { key: "methodology", href: "/methodology", icon: <FileSearch /> },
  ] as const;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <section className="mesh-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        <div className="relative mx-auto grid max-w-6xl 2xl:max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12">
          <div className="max-w-xl 2xl:max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100">{t("eyebrow")}</p>
            <h1 className="font-display text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.4rem]">{t("title")}</h1>
            <p className="mt-5 max-w-lg text-balance text-base text-muted-foreground md:text-lg">{t("lede")}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto" asChild><Link href="/observatory">{t("ctaPrimary")}<ArrowRight /></Link></Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild><Link href="/observatory/recommender">{t("ctaSecondary")}</Link></Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{t("trust")}</p>
          </div>
          <HomeLive variant="hero" />
        </div>
      </section>

      <section className="border-y border-border bg-sand-100/70 dark:bg-muted/40">
        <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-10 sm:px-6 md:py-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t("questionsTitle")}</h2>
          <ul className="mt-5 grid gap-3 text-[15px] leading-relaxed md:grid-cols-2">
            {(["q1", "q2", "q3", "q4", "q5"] as const).map((q) => (
              <li key={q} className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-card"><span className="mt-1 size-2 shrink-0 rounded-full bg-brand-600" />{t(`questions.${q}`)}</li>
            ))}
          </ul>
        </div>
      </section>

      <HomeLive variant="body" />

      <section className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-12 sm:px-6 md:py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("storyTitle")}</h2>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("storyLede")}</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.key}>
              <Link href={s.href} className="group block h-full rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-brand-400">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100 [&_svg]:size-5">{s.icon}</span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold group-hover:text-brand-800 dark:group-hover:text-brand-200">{s.key === "methodology" ? t("story.methodology.title") : nav(s.key)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`story.${s.key}.text`)}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-sand-100/70 dark:bg-muted/40">
        <div className="mx-auto grid max-w-6xl 2xl:max-w-[1400px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 md:gap-10 md:py-16">
          {[
            { icon: <Users />, title: t("hub.contribute.title"), text: t("hub.contribute.text"), href: "/contribute", cta: t("hub.contribute.cta") },
            { icon: <Compass />, title: t("hub.discovery.title"), text: t("hub.discovery.text"), href: "/research", cta: t("hub.discovery.cta") },
            { icon: <Database />, title: t("hub.data.title"), text: t("hub.data.text"), href: "/research#data", cta: t("hub.data.cta") },
          ].map((f) => (
            <div key={f.title}>
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-card text-brand-700 shadow-card [&_svg]:size-5">{f.icon}</span>
              <h3 className="mt-4 font-display text-2xl font-semibold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{f.text}</p>
              <Button variant="link" className="mt-2 px-0" asChild><Link href={f.href}>{f.cta}<ArrowRight /></Link></Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-12 sm:px-6 md:py-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{t("partnersTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("partnersText")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("krineaText")} <a href={KRINEA_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">Krinea</a>.</p>
          </div>
          <PartnerLogos className="mt-6 md:mt-0" />
        </div>
      </section>
    </>
  );
}
