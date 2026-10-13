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
    <div className="border-b border-border bg-white lg:sticky lg:top-[76px] lg:z-30">
      <div className="mx-auto w-full max-w-[1248px] px-8 max-md:px-4 2xl:max-w-[1400px]">
        <nav aria-label={t("sections")} className="tabrow gap-[26px] bg-none">
          {OBSERVATORY_SECTIONS.map((s) => {
            const active = isActive(s.href);
            return (
              <Link
                key={s.key}
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-baseline gap-[7px] whitespace-nowrap border-b-2 pb-[11px] pt-[13px] text-[15px] font-semibold no-underline",
                  active ? "border-primary text-primary" : "border-transparent text-ink-2 hover:text-primary",
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
