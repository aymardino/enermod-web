import * as React from "react";
import { useTranslations } from "next-intl";
import { BetaBanner } from "@/components/observatory/kpi";
import { cn } from "@/lib/utils";

/** The observatory's pages, indexed by italic roman numerals. `key` is the message key
 *  under `nav.obs`; the sub-nav, the page kickers, the mobile menu and the home contents use it. */
export const OBSERVATORY_SECTIONS = [
  { key: "dashboard", numeral: "i", href: "/observatory" },
  { key: "map", numeral: "ii", href: "/observatory/map" },
  { key: "gaps", numeral: "iii", href: "/observatory/gaps" },
  { key: "readiness", numeral: "iv", href: "/observatory/readiness" },
  { key: "studies", numeral: "v", href: "/observatory/studies" },
  { key: "tools", numeral: "vi", href: "/observatory/tools" },
  { key: "recommender", numeral: "vii", href: "/observatory/recommender" },
] as const;

export type ObservatorySectionKey = (typeof OBSERVATORY_SECTIONS)[number]["key"];

/** Eyebrow label above a page title: small blue uppercase. (`numeral` is accepted for older call
 *  sites and no longer shown.) */
export function Kicker({ children, className }: { numeral?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("kicker sc", className)}>
      <span>{children}</span>
    </p>
  );
}

/** Kicker for an observatory page: "ii · Map", from OBSERVATORY_SECTIONS and `nav.obs`. */
export function SectionKicker({ section, className }: { section: ObservatorySectionKey; className?: string }) {
  const t = useTranslations("nav.obs");
  const s = OBSERVATORY_SECTIONS.find((x) => x.key === section)!;
  return <Kicker numeral={s.numeral} className={className}>{t(s.key)}</Kicker>;
}

/** Observatory page head: kicker with the page numeral and name (or a custom `kicker`,
 *  e.g. "NGA · WAPP · West Africa"), the Beta banner, the 44px h1 and the sublede on the left;
 *  `aside` (scope tabs with counts, actions) bottom-right. Single column below 768px. */
export function PageHead({ section, kicker, beta = false, title, lede, aside, children, className }: {
  section?: ObservatorySectionKey;
  kicker?: React.ReactNode;
  /** true for the shared Beta sentence, or a custom sentence */
  beta?: boolean | string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-10 gap-y-5 max-md:grid-cols-[minmax(0,1fr)]", className)}>
      <div className="min-w-0">
        {kicker ? <Kicker className="mb-3.5">{kicker}</Kicker> : section ? <SectionKicker section={section} className="mb-3.5" /> : null}
        {beta && <BetaBanner text={typeof beta === "string" ? beta : undefined} className="mb-3.5" />}
        <h1 className="text-balance font-display text-[34px] font-bold leading-[1.08] tracking-[-0.018em] md:text-[44px]">{title}</h1>
        {lede && <p className="mt-3 max-w-[44em] font-display text-[17px] leading-[1.5] text-ink-2 md:text-[18.5px]">{lede}</p>}
        {children}
      </div>
      {aside && <div className="min-w-0 max-md:w-full">{aside}</div>}
    </header>
  );
}

/** Ruled block: 2px ink rule, block title (23px), 13px description,
 *  actions top right (ghost xs "Table", "CSV"). No box, no radius, no shadow. */
export function Block({ title, description, actions, children, className, contentClassName, id, as = "section", titleAs = "h2" }: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  as?: "section" | "div" | "article";
  titleAs?: "h2" | "h3";
}) {
  const Comp = as;
  const Title = titleAs;
  return (
    <Comp id={id} className={cn("min-w-0 border-t-2 border-rule pt-3.5", className)}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <Title className="font-display text-[23px] font-semibold leading-[1.2] tracking-[-0.005em]">{title}</Title>}
            {description && <p className="mt-1 max-w-[46em] text-[13px] leading-[1.5] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="-mt-0.5 flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      {children !== undefined && <div className={cn("mt-4 min-w-0", contentClassName)}>{children}</div>}
    </Comp>
  );
}
