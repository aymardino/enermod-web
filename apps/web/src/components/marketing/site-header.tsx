"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Code, Menu } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { AisesaLogo, EnermodWordmark } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/marketing/language-switch";
import { OBSERVATORY_SECTIONS } from "@/components/observatory/page-head";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, SheetContent, SheetHeader } from "@/components/ui/dialog";
import { isCurator, useMe } from "@/lib/auth";
import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Kept so existing imports (`@/components/marketing/site-header`) still compile. */
export { LanguageSwitch };

/** Page container: 1248px, 32px gutters, 16px on phones. Observatory pages widen to 1400px at 2xl. */
const WRAP = "mx-auto w-full max-w-[1248px] px-8 max-md:px-4";
const WRAP_WIDE = "mx-auto w-full max-w-[1248px] px-8 max-md:px-4 2xl:max-w-[1400px]";

const NAV: { key: "observatory" | "research" | "methodology" | "about" | "contribute"; href: string; numeral: string }[] = [
  { key: "observatory", href: "/observatory", numeral: "i" },
  { key: "research", href: "/research", numeral: "ii" },
  { key: "methodology", href: "/methodology", numeral: "iii" },
  { key: "about", href: "/about", numeral: "iv" },
  { key: "contribute", href: "/contribute", numeral: "v" },
];

/** "page" on the page itself, "true" anywhere inside its section (the observatory). */
function currentFor(pathname: string, href: string): "page" | "true" | undefined {
  if (pathname === href) return "page";
  return pathname.startsWith(`${href}/`) ? "true" : undefined;
}

/** Site header, three layers:
 *  1. utility strip (34px, scrolls away): AISESA logo + partner sentence, Source code, EN / FR, Sign in or account;
 *  2. masthead (72px, 60px on phones), sticky: the lockup and the right-aligned underlined nav;
 *  3. the graduated neatline, sticky with the masthead (sticky stack 78px, 66px on phones).
 *  Below 1024px the nav becomes an outline "Menu" button opening a full-height sheet.
 *  `wide` widens the containers to 1400px at 2xl, as the observatory's data pages do. */
export function SiteHeader({ wide = false }: { wide?: boolean }) {
  const t = useTranslations("nav");
  const c = useTranslations("common");
  const fr = useLocale() === "fr";
  const { data: me } = useMe();
  const pathname = usePathname();
  const curator = isCurator(me);
  const wrap = wide ? WRAP_WIDE : WRAP;
  const stripLink = "inline-flex min-h-7 items-center gap-1.5 px-1.5 no-underline hover:text-primary hover:underline";

  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-2 z-[60] -translate-y-[calc(100%+1rem)] rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground no-underline focus:translate-y-0"
      >
        {t("skip")}
      </a>

      {/* 1 · utility strip */}
      <div className="border-b border-brand-100 bg-brand-50 text-[13px] text-brand-900">
        <div className={cn(wrap, "flex h-[34px] items-center justify-between gap-4")}>
          <p className="flex min-w-0 items-center gap-2.5">
            <AisesaLogo height={20} priority />
            <span className="truncate max-md:hidden">{t("partner")}</span>
          </p>
          <nav aria-label={t("utilities")} className="flex flex-none items-center gap-2.5">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={cn(stripLink, "max-md:hidden")}>
              <Code className="size-[15px]" strokeWidth={1.5} aria-hidden="true" />
              {t("sourceCode")}
            </a>
            <LanguageSwitch />
            {curator && (
              <Link href="/admin" className={cn(stripLink, "hidden lg:inline-flex xl:hidden")}>
                {t("admin")}
              </Link>
            )}
            {me ? (
              <Link href="/contribute" className={cn(stripLink, "max-w-[16em]")}>
                <span className="min-w-0 truncate">{me.name || c("account")}</span>
              </Link>
            ) : (
              <Link href="/sign-in" className={stripLink}>
                {c("signIn")}
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* 2 · masthead and 3 · neatline, sticky together */}
      <header className="sticky top-0 z-40 bg-background">
        <div className={cn(wrap, "flex h-[72px] items-center justify-between gap-6 max-md:h-[60px]")}>
          <Link href="/" aria-label={t("home")} className="flex min-w-0 items-center no-underline">
            <EnermodWordmark />
          </Link>
          <div className="flex flex-none items-center gap-6">
            <nav aria-label={t("main")} className={cn("hidden items-center lg:flex", fr ? "gap-[22px]" : "gap-7")}>
              {NAV.map((n) => {
                const current = currentFor(pathname, n.href);
                return (
                  <Link
                    key={n.key}
                    href={n.href}
                    aria-current={current}
                    className={cn(
                      "whitespace-nowrap border-b-2 py-1.5 text-[16px] font-semibold no-underline",
                      current ? "border-primary text-primary" : "border-transparent text-foreground hover:border-brand-200 hover:text-primary",
                    )}
                  >
                    {t(n.key)}
                  </Link>
                );
              })}
            </nav>
            {curator && (
              <Button variant="outline" size="sm" className="hidden xl:inline-flex" asChild>
                <Link href="/admin">{t("admin")}</Link>
              </Button>
            )}
            <MobileMenu />
          </div>
        </div>
        <div className="neatline" aria-hidden="true" />
      </header>
    </>
  );
}

/** Mobile menu: a full-height paper sheet from the top. "Menu" and the ink X over a 2px rule,
 *  then the sections with italic rubric numerals (the observatory's pages follow, indented, inside the
 *  observatory), then EN / FR, Sign in or account, Contact and Source code. */
function MobileMenu() {
  const t = useTranslations("nav");
  const c = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const { data: me } = useMe();
  // The sheet is open for one page in one language: navigating or switching language closes it.
  const here = `${locale}:${pathname}`;
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === here;
  const close = () => setOpenAt(null);
  const inObservatory = pathname === "/observatory" || pathname.startsWith("/observatory/");
  const obsActive = (href: string) =>
    href === "/observatory" ? pathname === "/observatory" || pathname.startsWith("/observatory/countries") : pathname.startsWith(href);

  return (
    <Dialog open={open} onOpenChange={(v) => setOpenAt(v ? here : null)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <Menu strokeWidth={1.5} aria-hidden="true" />
          {t("menu")}
        </Button>
      </DialogTrigger>
      <SheetContent side="top" aria-describedby={undefined}>
        <div className="mx-auto w-full max-w-[1248px] px-4 pb-10 pt-4 md:px-8">
          <SheetHeader title={t("menu")} />
          <nav aria-label={t("main")}>
            <ol>
              {NAV.map((n) => {
                const current = currentFor(pathname, n.href);
                return (
                  <li key={n.key} className="border-b border-border">
                    <Link
                      href={n.href}
                      onClick={close}
                      aria-current={current}
                      className="grid min-h-[52px] grid-cols-[32px_minmax(0,1fr)] items-center text-[17px] font-medium text-foreground no-underline hover:bg-sand-100"
                    >
                      <span className={cn("justify-self-start border-b-2 py-0.5", current ? "border-foreground" : "border-transparent")}>{t(n.key)}</span>
                    </Link>
                    {n.key === "observatory" && inObservatory && (
                      <ol className="pb-2 pl-8">
                        {OBSERVATORY_SECTIONS.map((s) => {
                          const active = obsActive(s.href);
                          return (
                            <li key={s.key} className="border-t border-border">
                              <Link
                                href={s.href}
                                onClick={close}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "grid min-h-11 grid-cols-[34px_minmax(0,1fr)] items-baseline py-2.5 text-[15px] font-medium no-underline hover:bg-sand-100 hover:text-foreground",
                                  active ? "text-foreground" : "text-muted-foreground",
                                )}
                              >
                                <span className={cn("justify-self-start", active && "underline decoration-foreground decoration-2 underline-offset-[6px]")}>{t(`obs.${s.key}`)}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-[14px]">
            <LanguageSwitch />
            {me ? (
              <Link href="/contribute" onClick={close} className="link inline-flex min-h-7 max-w-full items-center">
                <span className="min-w-0 truncate">{me.name || c("account")}</span>
              </Link>
            ) : (
              <Link href="/sign-in" onClick={close} className="link inline-flex min-h-7 items-center">{c("signIn")}</Link>
            )}
          </div>
          <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3 text-[14px] text-muted-foreground">
            {isCurator(me) && (
              <li>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin" onClick={close}>{t("admin")}</Link>
                </Button>
              </li>
            )}
            <li>
              <Link href="/contact" onClick={close} className="inline-flex min-h-7 items-center no-underline hover:text-foreground">{t("contact")}</Link>
            </li>
            <li>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-7 items-center gap-1.5 no-underline hover:text-foreground">
                <Code className="size-[15px]" strokeWidth={1.5} aria-hidden="true" />
                {t("sourceCode")}
              </a>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Dialog>
  );
}
