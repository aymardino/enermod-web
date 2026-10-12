"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Code2, Menu, ShieldCheck } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { EnermodWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isCurator, useMe } from "@/lib/auth";
import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export function LanguageSwitch({ className, bare = false }: { className?: string; bare?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  return (
    <label className={className}>
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value as "en" | "fr" })}
        className={cn("h-8 rounded-md text-sm", bare ? "border-0 bg-transparent px-1 text-muted-foreground hover:text-foreground" : "border border-border bg-card px-2")}
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </label>
  );
}

const NAV: { key: "observatory" | "research" | "methodology" | "about" | "contribute"; href: string }[] = [
  { key: "observatory", href: "/observatory" },
  { key: "research", href: "/research" },
  { key: "methodology", href: "/methodology" },
  { key: "about", href: "/about" },
  { key: "contribute", href: "/contribute" },
];

export function SiteHeader() {
  const t = useTranslations("nav");
  const c = useTranslations("common");
  const { data: me } = useMe();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/observatory" ? pathname.startsWith("/observatory") : pathname === href);
  const account = me ? (
    <Button variant={isCurator(me) ? "default" : "outline"} size="sm" asChild>
      <Link href={isCurator(me) ? "/admin" : "/contribute"}>{isCurator(me) ? <><ShieldCheck />{t("admin")}</> : me.name || c("account")}</Link>
    </Button>
  ) : (
    <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild><Link href="/sign-in">{c("signIn")}</Link></Button>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl 2xl:max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center"><EnermodWordmark /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} className={cn("hover:text-foreground", active(n.href) && "text-foreground")}>{t(n.key)}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" asChild>
                <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label={t("github")}><Code2 className="size-4" /></a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("github")}</TooltipContent>
          </Tooltip>
          <LanguageSwitch bare className="hidden sm:block" />
          {account}
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("menu")} onClick={() => setOpen(true)}><Menu className="size-5" /></Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-4 max-w-sm translate-y-0 sm:top-[10%]">
          <DialogTitle className="font-display text-lg">{t("menu")}</DialogTitle>
          <nav className="mt-2 flex flex-col gap-1 text-base" aria-label="Mobile">
            {NAV.map((n) => <Link key={n.key} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-muted">{t(n.key)}</Link>)}
            <Link href="/contact" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-muted">{t("contact")}</Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md px-2 py-2 text-muted-foreground hover:bg-muted"><Code2 className="size-4" />{t("github")}</a>
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
            <LanguageSwitch />
            {me ? (
              <Button asChild><Link href={isCurator(me) ? "/admin" : "/contribute"} onClick={() => setOpen(false)}>{isCurator(me) ? t("admin") : t("contribute")}</Link></Button>
            ) : (
              <Button variant="outline" asChild><Link href="/sign-in" onClick={() => setOpen(false)}>{c("signIn")}</Link></Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
