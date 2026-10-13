"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { EnermodMark, EnermodWordmark } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/marketing/language-switch";
import { Button } from "@/components/ui/button";
import { StatusTag, Tag } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { isCurator, useMe, useSignOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "overview", href: "/admin" },
  { key: "contributions", href: "/admin/contributions" },
  { key: "discovery", href: "/admin/discovery" },
  { key: "imports", href: "/admin/imports" },
  { key: "analytics", href: "/admin/analytics" },
  { key: "users", href: "/admin/users" },
] as const;

/** Admin container: content runs full width up to 1400px, 32px gutters, 16px on phones. */
const WRAP = "mx-auto w-full max-w-[1400px] px-8 max-md:px-4";

/** Page body under the admin masthead: the shared container with the observatory's vertical rhythm. */
export function AdminPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(WRAP, "pb-[72px] pt-10 max-md:pb-14 max-md:pt-8", className)}>{children}</div>;
}

/** Status of a job or a discovery run (queued, running, done, failed) as a status tag:
 *  clock for waiting, check for done, X for failed. Unknown values print as they come. */
export function JobStatus({ status }: { status: string }) {
  const t = useTranslations("admin.jobStatus");
  return <StatusTag status={status}>{t.has(status) ? t(status) : status}</StatusTag>;
}

/** Curation shell: a 56px masthead (28px mark, wordmark without subline, solid "Curation" tag,
 *  the account line, EN / FR, sign out), the graduated neatline, then the curation sections as
 *  underline tabs. No utility strip. Sticky from 768px; scrolls away on phones. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("admin");
  const c = useTranslations("common");
  const nav = useTranslations("nav");
  const signOut = useSignOut();
  useEffect(() => {
    if (!isLoading && me === null) router.replace({ pathname: "/sign-in", query: { next: pathname } });
  }, [isLoading, me, router, pathname]);

  if (isLoading || !me) {
    return (
      <div className={cn(WRAP, "pt-10")}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  const leave = async () => {
    await signOut();
    router.push("/");
  };

  if (!isCurator(me)) {
    return (
      <main id="main" className="mx-auto w-full max-w-[480px] px-4 pb-20 pt-16">
        <EnermodMark className="size-[34px]" />
        <h1 className="mt-6 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.018em]">{t("noAccessTitle")}</h1>
        <div className="mt-5 border-t-2 border-rule pt-4">
          <p className="font-display text-[17px] leading-[1.5] text-ink-2">{t("noAccessText", { email: me.email })}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/">{t("backHome")}</Link>
            </Button>
            <Button variant="ghost" onClick={leave}>
              <LogOut aria-hidden="true" strokeWidth={1.5} />
              {c("signOut")}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const role = t.has(`users.roles.${me.role}`) ? t(`users.roles.${me.role}`) : me.role;
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="fixed left-4 top-2 z-[60] -translate-y-[calc(100%+1rem)] rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground no-underline focus:translate-y-0"
      >
        {nav("skip")}
      </a>
      <header className="bg-background md:sticky md:top-0 md:z-40">
        <div className={cn(WRAP, "flex h-14 items-center justify-between gap-4")}>
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label={nav("home")} className="min-w-0 no-underline">
              {/* the lockup does not fit beside the tag, EN / FR and sign out below 420px: the mark alone */}
              <EnermodWordmark size={28} compact className="max-[420px]:hidden" />
              <EnermodMark className="hidden size-7 max-[420px]:block" />
            </Link>
            <Tag variant="solid">{t("title")}</Tag>
          </div>
          <div className="flex flex-none items-center gap-1.5 text-[12.5px] text-muted-foreground sm:gap-2.5">
            <span className="hidden max-w-[26em] truncate lg:inline" title={me.email}>
              <span className="sr-only">{t("signedInAs", { email: me.email, role })}</span>
              <span aria-hidden="true">
                {me.email} · {role}
              </span>
            </span>
            <LanguageSwitch />
            <Button variant="ghost" size="sm" onClick={leave} className="max-sm:w-8 max-sm:px-0" aria-label={c("signOut")}>
              <LogOut aria-hidden="true" strokeWidth={1.5} />
              <span className="max-sm:hidden">{c("signOut")}</span>
            </Button>
          </div>
        </div>
        <div className="neatline" aria-hidden="true" />
        <div className="border-b border-border">
          <div className={WRAP}>
            <nav aria-label={t("sections")} className="tabrow gap-[26px] bg-none">
              {ITEMS.map((i) => {
                const active = isActive(i.href);
                return (
                  <Link
                    key={i.key}
                    href={i.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-baseline whitespace-nowrap border-b-2 pb-[11px] pt-[13px] text-sm font-medium no-underline",
                      active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`nav.${i.key}`)}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1 bg-background">
        {children}
      </main>
    </div>
  );
}
