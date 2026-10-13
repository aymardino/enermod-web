import * as React from "react";
import { cn } from "@/lib/utils";

/** Booktabs table: 2px rule above the header, 1px below, 2px closing rule, hairlines
 *  between rows, no wrapper box. The wrapper only scrolls; on phones it reaches the screen edge.
 *  `stickyFirst` pins the first column on phones (country tables). */
export function Table({ className, wrapperClassName, stickyFirst = false, ...props }: React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string; stickyFirst?: boolean }) {
  return (
    <div className={cn("relative min-w-0 overflow-x-auto max-md:-mr-4 max-md:pr-4", wrapperClassName)}>
      <table className={cn("booktabs w-full border-collapse caption-bottom text-sm", className)} data-sticky-first={stickyFirst || undefined} {...props} />
    </div>
  );
}
export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(className)} {...props} />;
}
export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />;
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("data-[state=selected]:bg-accent", className)} {...props} />;
}

type CellExtras = {
  /** right-aligned, tabular figures */
  numeric?: boolean;
  /** hidden below 768px (column priority: Tools, Region and Power pool go first) */
  lowPriority?: boolean;
};

/** Header cell. Pass `sort="descending" | "ascending"` on the sorted column: it sets `aria-sort`,
 *  turns the head ink and adds a rubric caret. */
export function TH({ className, numeric, lowPriority, sort, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & CellExtras & { sort?: "ascending" | "descending" }) {
  return (
    <th
      scope="col"
      aria-sort={sort}
      className={cn(
        "whitespace-nowrap border-b border-t-2 border-rule px-3 pb-2 pt-2.5 text-left align-bottom text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.09em] text-muted-foreground first:pl-0 last:pr-0",
        numeric && "text-right",
        lowPriority && "max-md:hidden",
        className,
      )}
      {...props}
    />
  );
}
export function TD({ className, numeric, lowPriority, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & CellExtras) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-b border-border px-3 py-[9px] align-middle first:pl-0 last:pr-0",
        numeric && "text-right tabular-nums",
        lowPriority && "max-md:hidden",
        className,
      )}
      {...props}
    />
  );
}

/** ISO3 prefix in a country cell: `<IsoCode>NGA</IsoCode><Link …>Nigeria</Link>`. */
export function IsoCode({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-block w-[34px] shrink-0 text-[11px] font-semibold tabular-nums tracking-[0.06em] text-muted-foreground", className)} {...props} />;
}

/** Class for the country name link in a table cell: ink, 600, lapis underline on hover, 24px target. */
export const countryLinkClass = "inline-block py-1 font-semibold no-underline decoration-link underline-offset-3 hover:underline";

/** Score meter: the number, then a 56×8 sand track with an ink fill. `value` null renders
 *  `empty` (e.g. "not ranked") in italic serif with an empty track. Meters collapse to numbers on phones. */
export function Meter({ value, max, label, empty, className }: { value: number | null; max: number; label?: React.ReactNode; empty?: React.ReactNode; className?: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span className={cn("inline-flex items-center justify-end gap-2 tabular-nums", className)}>
      {value === null ? <span className="not-assessed text-[13.5px]">{empty}</span> : <span>{label ?? value}</span>}
      <i aria-hidden="true" className="relative inline-block h-2 w-14 shrink-0 bg-sand-200 max-md:hidden">
        <b className="absolute inset-y-0 left-0 bg-mark-ink" style={{ width: `${pct}%` }} />
      </i>
    </span>
  );
}
