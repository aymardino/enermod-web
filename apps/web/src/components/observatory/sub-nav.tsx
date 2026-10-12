"use client";

import { useTranslations } from "next-intl";
import { BarChart3, BookOpen, Compass, Gauge, Map as MapIcon, Search, Wrench } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "dashboard", href: "/observatory", icon: <Compass /> },
  { key: "map", href: "/observatory/map", icon: <MapIcon /> },
  { key: "gaps", href: "/observatory/gaps", icon: <BarChart3 /> },
  { key: "readiness", href: "/observatory/readiness", icon: <Gauge /> },
  { key: "studies", href: "/observatory/studies", icon: <Search /> },
  { key: "tools", href: "/observatory/tools", icon: <Wrench /> },
  { key: "recommender", href: "/observatory/recommender", icon: <BookOpen /> },
] as const;

export function ObservatoryNav() {
  const t = useTranslations("nav.obs");
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/observatory" ? pathname === "/observatory" || pathname.startsWith("/observatory/countries") : pathname.startsWith(href);
  return (
    <div className="border-b border-border bg-card/60">
      <nav className="scrollbar-thin mx-auto flex max-w-6xl 2xl:max-w-[1400px] gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Observatory">
        {ITEMS.map((i) => (
          <Link key={i.key} href={i.href}
            className={cn("inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium [&_svg]:size-4",
              isActive(i.href) ? "border-brand-600 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {i.icon}{t(i.key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
