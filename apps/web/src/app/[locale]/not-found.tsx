import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Kicker, OBSERVATORY_SECTIONS } from "@/components/observatory/page-head";
import { Button } from "@/components/ui/button";

/** 404 in the visitor's language, inside the site chrome: rubric kicker, reading h1, lede, one ink
 *  action and a text link, then the observatory's pages as a ruled list of where to go next. */
export default function NotFound() {
  const t = useTranslations("notFound");
  const o = useTranslations("nav.obs");
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-[1248px] px-8 pb-[72px] pt-12 max-md:px-4 max-md:pb-14 max-md:pt-9">
          <Kicker>{t("kicker")}</Kicker>
          <h1 className="mt-3.5 max-w-[18em] text-balance font-display text-[36px] font-bold leading-[1.06] tracking-[-0.02em] md:text-[48px]">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-[36em] font-display text-[17px] leading-[1.5] text-ink-2 md:text-[18.5px]">{t("lede")}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-1 max-md:flex-col max-md:items-stretch">
            <Button size="lg" asChild>
              <Link href="/">
                {t("home")}
                <ArrowRight strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </Button>
            <Link href="/observatory" className="link inline-flex min-h-11 items-center text-[15.5px] font-medium max-md:justify-center">
              {t("observatory")}
            </Link>
          </div>

          <section aria-labelledby="nf-next" className="mt-14 max-w-[860px]">
            <h2 id="nf-next" className="sc border-t-2 border-rule pt-3 text-foreground">{t("next")}</h2>
            <ol className="mt-1.5 grid grid-cols-2 gap-x-10 max-md:grid-cols-1">
              {OBSERVATORY_SECTIONS.map((s) => (
                <li key={s.key} className="border-b border-border">
                  <Link
                    href={s.href}
                    className="group grid min-h-[52px] grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-x-2 no-underline hover:bg-sand-100"
                  >
                    <span className="font-display text-[21px] font-bold leading-[1.25] tracking-[-0.005em] group-hover:underline group-hover:decoration-link group-hover:underline-offset-4">
                      {o(s.key)}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground" strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
