import { PhotoCredits } from "@/components/marketing/photo-credits";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Markdown, ProseLayout, extractHeadings, splitIntro } from "@/components/marketing/prose";
import { LiveFigures } from "@/components/observatory/live-figures";

/** Markdown pages, one file per language under content/<locale>/<slug>.md. */
const SLUGS = ["about", "methodology", "research", "privacy", "legal"] as const;
type Slug = (typeof SLUGS)[number];

/** Rubric kicker of each page: the masthead numeral and name, or the footer group for the legal pages. */
const KICKER: Record<Slug, { key: string; numeral?: string }> = {
  research: { key: "research", numeral: "ii" },
  methodology: { key: "methodology", numeral: "iii" },
  about: { key: "about", numeral: "iv" },
  privacy: { key: "footer.data" },
  legal: { key: "footer.data" },
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SLUGS.map((slug) => ({ locale, slug })));
}

function read(locale: string, slug: Slug): string | null {
  const file = path.join(process.cwd(), "content", locale, `${slug}.md`);
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!SLUGS.includes(slug as Slug)) return {};
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t(`${slug}.title`), description: t(`${slug}.description`), alternates: { languages: { en: `/${slug}`, fr: `/fr/${slug}` } } };
}

export default async function ContentPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug: raw } = await params;
  if (!SLUGS.includes(raw as Slug)) notFound();
  const slug = raw as Slug;
  setRequestLocale(locale);
  const own = read(locale, slug);
  const source = own ?? read("en", slug);
  if (!source) notFound();
  const lang = own ? locale : "en";
  const t = await getTranslations({ locale, namespace: "pages" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const r = await getTranslations({ locale, namespace: "reading" });

  // What precedes the first h2 is the lede (methodology, research), or a version line in italics
  // (privacy, legal), which then sits under the page description.
  const { intro, body } = splitIntro(source);
  const versionLine = /^\*[^*\n]+\*$/.test(intro);
  const lede = intro && !versionLine ? <Markdown source={intro} locale={lang} /> : <p>{t(`${slug}.description`)}</p>;
  const meta = versionLine ? <Markdown source={intro.replace(/^\*|\*$/g, "")} locale={lang} /> : undefined;
  const headline = r.has(`headline.${slug}`) ? r(`headline.${slug}`) : t(`${slug}.title`);
  const live = slug === "methodology" || slug === "about" || slug === "research";

  return (
    <ProseLayout
      kicker={nav(KICKER[slug].key)}
      numeral={KICKER[slug].numeral}
      title={headline}
      lede={lede}
      meta={meta}
      toc={extractHeadings(body, lang)}
      tocLabel={r("toc")}
      aside={live ? <LiveFigures /> : undefined}
      photo={slug === "about" ? "aisesa-congress-talk" : slug === "research" ? "aisesa-congress-group" : slug === "methodology" ? "inga-dam" : undefined}
    >
      <Markdown source={body} locale={lang} />
      {slug === "legal" && <PhotoCredits title={r("photoCredits")} locale={locale} />}
    </ProseLayout>
  );
}
