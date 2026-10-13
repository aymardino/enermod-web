import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BetaTag } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "brand" | "coral" | "amber";

/** Splits a trailing "/54", "/10", " / 15" or "%" (incl. the French " %") off a string value so it
 *  can be set as the smaller muted suffix. Non-string values are returned as they are. */
function splitSuffix(value: React.ReactNode): [React.ReactNode, string | null] {
  if (typeof value !== "string") return [value, null];
  const m = /^(.*\d)(\s?\/\s?[\d.,   ]+|[\s  ]?%)$/.exec(value);
  return m ? [m[1], m[2]] : [value, null];
}

/** KPI strip: one ruled strip, 2px ink rule on top, 1px under, hairlines between cells,
 *  values aligned through subgrid when labels wrap. Columns follow the number of cells (max 6),
 *  3 at tablet width (2 when there are 4), 2 on phones (an odd last cell spans the row).
 *  `size="sm"` sets 20px values for secondary facts (governance, data, NDC…). */
export function KpiStrip({ children, className, size = "default", cols }: { children: React.ReactNode; className?: string; size?: "default" | "sm"; cols?: number }) {
  const n = cols ?? Math.max(1, React.Children.toArray(children).length);
  const lg = Math.min(n, 6);
  const md = n === 4 ? 2 : Math.min(n, 3);
  const sm = Math.min(n, 2);
  return (
    <div
      className={cn("kpis", className)}
      data-size={size === "sm" ? "sm" : undefined}
      style={{ "--kpi-cols": lg, "--kpi-cols-md": md, "--kpi-cols-sm": sm } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/** One KPI cell: small-caps label, 38px figure (suffix such as "/54" or "%" set smaller and muted),
 *  hint. Outside a KpiStrip it stands alone under its own 2px rule, so the legacy
 *  `grid … <Kpi>` wrappers still read as ruled figures. `href` turns the cell into a link. */
export function Kpi({ label, value, hint, className, tone, suffix, href }: {
  label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; className?: string; tone?: Tone; suffix?: React.ReactNode; href?: string;
}) {
  const [main, auto] = suffix === undefined ? splitSuffix(value) : [value, null];
  const tail = suffix ?? auto;
  const body = (
    <>
      <p className="kpi-l">{label}</p>
      <p className={cn("kpi-v", tone === "coral" && "text-coral-700", tone === "amber" && "text-amber-700")}>
        {main}
        {tail !== null && tail !== undefined && <small>{tail}</small>}
      </p>
      {hint ? <p className="kpi-h">{hint}</p> : <span aria-hidden="true" />}
    </>
  );
  if (href) return <Link href={href} className={cn("kpi no-underline", className)}>{body}</Link>;
  return <div className={cn("kpi", className)}>{body}</div>;
}

/** Home "Inventory today": 2×2 figures, 2px rule on top, 1px under, hairline cross. */
export function Figs({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("figs", className)}>{children}</dl>;
}
export function Fig({ label, value, suffix, hint }: { label: React.ReactNode; value: React.ReactNode; suffix?: React.ReactNode; hint?: React.ReactNode }) {
  const [main, auto] = suffix === undefined ? splitSuffix(value) : [value, null];
  const tail = suffix ?? auto;
  return (
    <div>
      <dt>{label}</dt>
      <dd className="fig-v">{main}{tail !== null && tail !== undefined && <small>{tail}</small>}</dd>
      <dd className="fig-h">{hint}</dd>
    </div>
  );
}

/** Legacy section wrapper, now a ruled block: 2px ink rule, block title, 13px description,
 *  actions top right. New code uses `Block` from observatory/page-head.tsx. */
export function Section({ title, lede, children, className, actions }: { title: React.ReactNode; lede?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("mt-12 min-w-0 border-t-2 border-rule pt-3.5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-display text-[23px] font-semibold leading-[1.2] tracking-[-0.005em]">{title}</h2>
          {lede && <p className="mt-1 max-w-[46em] text-[13px] leading-[1.5] text-muted-foreground">{lede}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

/** Callout: no background, a 2px left rule (rubric for `brand`, ochre for `amber` and
 *  `coral`), italic 15px; links are ink with a lapis underline. */
export function Callout({ children, tone = "amber", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <div
      className={cn(
        "border-l-2 py-0.5 pl-3.5 font-display text-[15px] leading-[1.45] text-ink-2",
        "[&_a]:text-foreground [&_a]:underline [&_a]:decoration-link [&_a]:decoration-1 [&_a]:underline-offset-3 [&_a:hover]:text-link",
        tone === "brand" ? "border-rubric" : "border-amber-500",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Beta banner, placed above the page h1: the warn "Beta" tag and a 12.5px ochre sentence.
 *  Without `text` it uses the shared sentence; a legacy `text` that starts with "Beta:" or
 *  "Bêta :" loses that prefix, since the tag already says it. */
export function BetaBanner({ text, className }: { text?: string; className?: string }) {
  const t = useTranslations("ui.beta");
  const sentence = text ? text.replace(/^\s*b[eê]ta\s*[:   ]*\s*/i, "") : t("text");
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] leading-[1.4] text-amber-700", className)}>
      <BetaTag>{t("tag")}</BetaTag>
      <span>{sentence.charAt(0).toUpperCase() + sentence.slice(1)}</span>
    </p>
  );
}

/** Figure caption: serif 14.5px muted, led by "Fig. n" in small caps.
 *  `fig` is a number ("Fig. 2") or a ready label ("Fig. 1b"). */
export function Caption({ fig, children, className, as = "figcaption" }: { fig?: number | string; children: React.ReactNode; className?: string; as?: "figcaption" | "p" }) {
  const Comp = as;
  return (
    <Comp className={cn("cap mt-3", className)}>
      {fig !== undefined && <b>{typeof fig === "number" ? `Fig. ${fig}` : fig}</b>}
      {children}
    </Comp>
  );
}
