import * as React from "react";
import { useTranslations } from "next-intl";
import { PageBanner, type Crumb } from "@/components/marketing/page-banner";
import type { PhotoId } from "@/data/photos";
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

/** Banner photo of each observatory section (credits in src/data/photos.ts). */
export const SECTION_PHOTO: Record<ObservatorySectionKey, PhotoId> = {
  dashboard: "transmission-line",
  map: "akosombo-dam",
  gaps: "rural-electrification-nigeria",
  readiness: "geothermal-kenya",
  studies: "lake-turkana-wind",
  tools: "solar-technicians",
  recommender: "gouda-wind-farm",
};

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

/** Page head: the full-width green banner (breadcrumb, eyebrow, title, lede, Beta note), then
 *  `aside` (scope tabs, actions) at the top of the content. `section` builds the breadcrumb
 *  (Observatory › page); `crumbs` overrides it. Sits inside the page container (it bleeds out). */
export function PageHead({ section, kicker, title, lede, aside, children, crumbs, photo, className }: {
  section?: ObservatorySectionKey;
  kicker?: React.ReactNode;
  /** accepted for older call sites; the Beta notice now lives in the header */
  beta?: boolean | string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
  crumbs?: Crumb[];
  /** banner photo; observatory sections have a default one */
  photo?: PhotoId | null;
  className?: string;
}) {
  const nav = useTranslations("nav");
  const s = section ? OBSERVATORY_SECTIONS.find((x) => x.key === section) : undefined;
  const trail: Crumb[] | undefined =
    crumbs ??
    (s
      ? s.key === "dashboard"
        ? [{ label: nav("observatory") }]
        : [{ label: nav("observatory"), href: "/observatory" }, { label: nav(`obs.${s.key}`) }]
      : undefined);
  return (
    <>
      <PageBanner bleed wide crumbs={trail} eyebrow={kicker} title={title} lede={lede} photo={photo === null ? undefined : photo ?? (s ? SECTION_PHOTO[s.key] : undefined)} className={className}>
        {children}
      </PageBanner>
      {aside ? <div className="mt-8 min-w-0">{aside}</div> : null}
      <div aria-hidden="true" className="h-8 max-md:h-6" />
    </>
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
    <Comp id={id} className={cn("min-w-0 rounded-lg border border-border bg-card p-5 shadow-card md:p-6", className)}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <Title className="text-[20px] font-bold leading-[1.25]">{title}</Title>}
            {description && <p className="mt-1 max-w-[46em] text-[14px] leading-[1.5] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="-mt-0.5 flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      {children !== undefined && <div className={cn("mt-4 min-w-0", contentClassName)}>{children}</div>}
    </Comp>
  );
}
