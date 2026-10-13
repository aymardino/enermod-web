"use client";

import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const NAMES: Record<Locale, { short: string; long: string }> = {
  en: { short: "EN", long: "English" },
  fr: { short: "FR", long: "Français" },
};

/** Language switch: text links "EN / FR" (utility strip, mobile sheet) or, with `long`,
 *  "English / Français" (footer). Keeps the current path; the current language carries
 *  aria-current and a 2px rubric underline. Each link has lang and hrefLang. */
export function LanguageSwitch({ long = false, className }: { long?: boolean; className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <span role="group" aria-label={t("language")} className={cn("inline-flex items-center gap-0.5", className)}>
      {routing.locales.map((l, i) => {
        const current = l === locale;
        return (
          <Fragment key={l}>
            {i > 0 && <span aria-hidden="true" className="text-input">/</span>}
            <Link
              href={pathname}
              locale={l}
              lang={l}
              hrefLang={l}
              aria-current={current ? "true" : undefined}
              aria-label={long ? undefined : NAMES[l].long}
              className={cn(
                "inline-flex min-h-7 min-w-7 items-center justify-center px-1 no-underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                current ? "font-semibold text-foreground underline decoration-rubric decoration-2 underline-offset-[5px]" : "text-muted-foreground",
              )}
            >
              {long ? NAMES[l].long : NAMES[l].short}
            </Link>
          </Fragment>
        );
      })}
    </span>
  );
}
