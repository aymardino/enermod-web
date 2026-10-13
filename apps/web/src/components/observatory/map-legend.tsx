"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Stepped legend of a five-class map: 52px swatches with 2px paper gaps (full width on
 *  phones), the class bounds in bold and, under them, the number of countries in each class. */
export function StepLegend({
  title,
  colors,
  labels,
  counts,
  perClass = true,
  className,
}: {
  /** "Studies per country"; " · number of countries per class" is appended when counts are shown */
  title?: ReactNode;
  colors: readonly string[];
  labels: readonly string[];
  counts?: readonly number[];
  perClass?: boolean;
  className?: string;
}) {
  const t = useTranslations("ui.map");
  const format = useFormatter();
  return (
    <div className={cn("min-w-0 max-md:w-full", className)}>
      {title && (
        <p className="mb-2 text-[12.5px] font-semibold leading-snug text-foreground">
          {title}
          {counts && perClass && <span className="font-normal text-muted-foreground"> · {t("perClass")}</span>}
        </p>
      )}
      <div className="grid grid-cols-[repeat(5,52px)] max-md:grid-cols-[repeat(5,minmax(0,1fr))]">
        {colors.map((c, i) => (
          <i key={`k${i}`} aria-hidden className="block h-3 border-r-2 border-background" style={{ background: c }} />
        ))}
        {labels.map((l, i) => (
          <span key={`l${i}`} className="mt-[5px] min-w-0 pr-1 text-[11.5px] leading-[1.3] tabular-nums text-muted-foreground">
            <b className="block font-semibold text-foreground">{l}</b>
            {counts && (
              <>
                <span aria-hidden>{format.number(counts[i] ?? 0)}</span>
                <span className="sr-only">{t("nCountries", { n: counts[i] ?? 0 })}</span>
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export type LegendKeyKind = "nodata" | "zero" | "island";

/** One symbol key next to the steps: hatch ("Not in the inventory"), empty land ("No studies"),
 *  island dot ("Island states, as dots"). */
export function LegendKey({ kind, label, color }: { kind: LegendKeyKind; label: ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] leading-tight text-muted-foreground">
      {kind === "nodata" && <span aria-hidden className="hatch-nodata h-3 w-[18px] flex-none shadow-[inset_0_0_0_1px_var(--coast)]" />}
      {kind === "zero" && <span aria-hidden className="h-3 w-[18px] flex-none bg-sand-200 shadow-[inset_0_0_0_1px_var(--coast)]" />}
      {kind === "island" && (
        <span aria-hidden className="size-[9px] flex-none rounded-full border border-coast" style={{ background: color ?? "var(--seq-count-1)" }} />
      )}
      {label}
    </span>
  );
}

/** The legend row under a map plate: steps first, then the symbol keys, opened by a hairline. */
export function MapLegend({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-4 flex flex-wrap items-end gap-x-[26px] gap-y-3.5 border-t border-border pt-3", className)}>{children}</div>
  );
}
