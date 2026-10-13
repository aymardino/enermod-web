"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { OBSERVATORY_SECTIONS } from "@/components/observatory/page-head";
import { cn } from "@/lib/utils";

/** Observatory sub-nav: paper, a full-width bottom hairline, underline items indexed by italic
 *  rubric roman numerals (aria-hidden), no icons. Scrolls sideways on phones without a scrollbar
 *  (.tabrow keeps focus outlines visible inside the scroller); sticky under the masthead from 1024px. */
export function ObservatoryNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/observatory" ? pathname === "/observatory" || pathname.startsWith("/observatory/countries") : pathname.startsWith(href);
  return (
    <div className="border-b border-brand-100 bg-brand-50 lg:sticky lg:top-[76px] lg:z-30">
      <div className="mx-auto w-full max-w-[1800px] px-6 lg:px-12 max-md:px-4">
        <nav aria-label={t("sections")} className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {OBSERVATORY_SECTIONS.map((s) => {
            const active = isActive(s.href);
            return (
              <Link
                key={s.key}
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "my-2 flex shrink-0 items-center whitespace-nowrap rounded-md px-4 py-2 text-[16px] font-semibold no-underline",
                  active ? "bg-white text-brand-800 shadow-[0_1px_3px_rgb(16_24_40/0.15)] ring-1 ring-brand-200" : "text-brand-900 hover:bg-white/70",
                )}
              >
                {t(`obs.${s.key}`)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
