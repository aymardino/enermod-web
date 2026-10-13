"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

/** Progress: a 6px square sand track with an ink fill (`tone="amber"` for warnings). */
export const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { tone?: "brand" | "ink" | "amber" }>(
  ({ className, value, tone = "ink", ...props }, ref) => (
    <ProgressPrimitive.Root ref={ref} value={value} className={cn("relative h-1.5 w-full overflow-hidden rounded-none bg-sand-200", className)} {...props}>
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1", tone === "amber" ? "bg-amber-500" : "bg-mark-ink")}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  ),
);
Progress.displayName = "Progress";

/** Separator: a decorative hairline, or `variant="rule"` for a 1px ink rule. */
export const Separator = React.forwardRef<React.ElementRef<typeof SeparatorPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & { variant?: "hairline" | "rule" }>(
  ({ className, orientation = "horizontal", decorative = true, variant = "hairline", ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn("shrink-0", variant === "rule" ? "bg-rule" : "bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";

/** Avatar: square sand tile with initials. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <AvatarPrimitive.Root className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-sm", className)}>
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center rounded-sm bg-sand-200 text-xs font-semibold text-foreground">{initials}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

/** Skeleton: flat muted blocks, no shimmer (reduced-motion safe). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("rounded-sm bg-muted", className)} {...props} />;
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-input bg-card px-1.5 font-sans text-[11px] font-medium text-muted-foreground", className)}>{children}</kbd>;
}

/** Empty state: a square dashed frame, a 24px muted icon, a serif title and an italic note. */
export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center border border-dashed border-input px-6 py-8 text-center", className)}>
      {icon && <div aria-hidden="true" className="mb-3 text-muted-foreground [&_svg]:size-6 [&_svg]:stroke-[1.5]">{icon}</div>}
      <p className="font-display text-[20px] font-semibold leading-[1.25]">{title}</p>
      {description && <p className="mt-1.5 max-w-md font-display text-[15px] leading-[1.45] text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A single figure under a 2px rule (the KPI cell look outside a strip). Prefer KpiStrip + Kpi. */
export function Stat({ label, value, hint, tone, className }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; tone?: "brand" | "coral" | "amber"; className?: string }) {
  return (
    <div className={cn("kpi", className)}>
      <p className="kpi-l">{label}</p>
      <p className={cn("kpi-v", tone === "coral" && "text-coral-700", tone === "amber" && "text-amber-700")}>{value}</p>
      {hint && <p className="kpi-h">{hint}</p>}
    </div>
  );
}

/** Generic page header (admin, account pages): optional rubric kicker, h1, sublede,
 *  actions on the right. Observatory pages use `PageHead` from observatory/page-head.tsx. */
export function PageHeader({ title, description, actions, kicker, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; kicker?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4", className)}>
      <div className="min-w-0 max-w-full">
        {kicker && <p className="kicker sc mb-3">{kicker}</p>}
        <h1 className="text-balance font-display text-[30px] font-bold leading-[1.08] tracking-[-0.018em] md:text-[38px]">{title}</h1>
        {description && <p className="mt-3 max-w-[44em] font-display text-[17px] leading-[1.5] text-ink-2 md:text-[18px]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
