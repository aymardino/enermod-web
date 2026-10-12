"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, FileUp, Inbox, LayoutGrid, LogOut, Radar, Users } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { EnermodWordmark } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { isCurator, useMe, useSignOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "overview", href: "/admin", icon: <LayoutGrid /> },
  { key: "contributions", href: "/admin/contributions", icon: <Inbox /> },
  { key: "discovery", href: "/admin/discovery", icon: <Radar /> },
  { key: "imports", href: "/admin/imports", icon: <FileUp /> },
  { key: "analytics", href: "/admin/analytics", icon: <BarChart3 /> },
  { key: "users", href: "/admin/users", icon: <Users /> },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("admin");
  const c = useTranslations("common");
  const signOut = useSignOut();
  useEffect(() => {
    if (!isLoading && me === null) router.replace({ pathname: "/sign-in", query: { next: pathname } });
  }, [isLoading, me, router, pathname]);
  if (isLoading || !me) return <div className="mx-auto max-w-7xl p-6"><Skeleton className="h-8 w-48" /><Skeleton className="mt-6 h-40 w-full" /></div>;
  if (!isCurator(me)) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">{t("noAccessTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("noAccessText", { email: me.email })}</p>
        <div className="mt-6 flex justify-center gap-2"><Button variant="outline" asChild><Link href="/">{t("backHome")}</Link></Button><Button variant="ghost" onClick={async () => { await signOut(); router.push("/"); }}><LogOut />{c("signOut")}</Button></div>
      </main>
    );
  }
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4"><Link href="/"><EnermodWordmark size={28} compact /></Link><span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-900 dark:bg-brand-900 dark:text-brand-100">{t("title")}</span></div>
          <div className="flex items-center gap-3 text-sm"><span className="hidden text-muted-foreground sm:inline">{me.email} · {me.role}</span><LanguageSwitch className="hidden sm:block" /><Button variant="ghost" size="sm" onClick={async () => { await signOut(); router.push("/"); }}><LogOut />{c("signOut")}</Button></div>
        </div>
        <nav className="scrollbar-thin flex gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Admin">
          {ITEMS.map((i) => <Link key={i.key} href={i.href} className={cn("inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium [&_svg]:size-4", (i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href)) ? "border-brand-600 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{i.icon}{t(`nav.${i.key}`)}</Link>)}
        </nav>
      </header>
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
