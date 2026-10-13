import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Clock, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tags are never interactive, so they have no border (a faint tint); chips, which are
 *  interactive, live in observatory/filters.tsx and always do. */
const tagVariants = cva(
  "inline-flex h-[22px] max-w-full items-center gap-1.5 whitespace-nowrap rounded-sm px-[7px] text-xs font-medium leading-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground", // tint
        plain: "bg-transparent px-0 text-foreground", // ledger rows
        solid: "bg-foreground text-card", // tool names, families, approved
        warn: "bg-amber-100 font-semibold text-amber-700", // Beta, pending (with an icon)
        danger: "bg-coral-100 text-destructive", // rejected, failed
        // legacy names, kept so existing call sites compile until the pages migrate
        outline: "bg-muted text-foreground", // = default
        secondary: "bg-muted text-foreground", // = default
        brand: "bg-foreground text-card", // = solid
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type TagVariant = NonNullable<VariantProps<typeof tagVariants>["variant"]>;
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {}

export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant }), className)} {...props} />;
}

/** Legacy alias: `Badge` is `Tag`. New code imports `Tag`. */
export const Badge = Tag;
export type BadgeProps = TagProps;

export type KeyKind = "full" | "light" | "africa" | "outside" | "mixed" | "ink" | "nodata" | "partial";

/** Shaped colour key that leads a data-bearing tag or a legend entry.
 *  9px in tags, 12px (`size="lg"`) in legends. Decorative: the label next to it carries the meaning. */
export function Key({ kind, size = "sm", className }: { kind: KeyKind; size?: "sm" | "lg"; className?: string }) {
  return (
    <i
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 not-italic",
        size === "lg" ? "size-3" : "size-[9px]",
        kind === "full" && "bg-full",
        kind === "light" && "bg-[linear-gradient(to_top,var(--light)_50%,transparent_50%)] shadow-[inset_0_0_0_1.25px_var(--light)]",
        kind === "africa" && "bg-africa",
        kind === "outside" && "bg-outside",
        kind === "mixed" && size === "sm" && "bg-[linear-gradient(135deg,var(--africa)_50%,var(--outside)_50%)]",
        kind === "mixed" && size === "lg" && "fill-mixed",
        kind === "ink" && "bg-mark-ink",
        kind === "nodata" && "hatch-nodata shadow-[inset_0_0_0_1px_var(--coast)]",
        kind === "partial" && "bg-[repeating-linear-gradient(45deg,var(--light)_0_1.3px,var(--background)_1.3px_3.4px)] shadow-[inset_0_0_0_1px_var(--light)]",
        className,
      )}
    />
  );
}

/** "not assessed" is not a tag: italic serif, muted. */
export function NotAssessed({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("not-assessed", className)}>{children}</span>;
}

/** Admin statuses: pending = warn + clock, approved = solid + check, rejected = danger + X.
 *  Anything else renders as a plain tint tag. The label is the caller's (translated) text. */
export function StatusTag({ status, children, className }: { status: string; children: React.ReactNode; className?: string }) {
  const s = status.toLowerCase();
  if (["pending", "new", "queued", "running"].includes(s)) return <Tag variant="warn" className={className}><Clock aria-hidden="true" />{children}</Tag>;
  if (["approved", "done", "accepted", "relevant", "ok"].includes(s)) return <Tag variant="solid" className={className}><Check aria-hidden="true" />{children}</Tag>;
  if (["rejected", "failed", "error", "irrelevant"].includes(s)) return <Tag variant="danger" className={className}><X aria-hidden="true" />{children}</Tag>;
  return <Tag className={className}>{children}</Tag>;
}

/** The Beta tag: warn tint, triangle icon, the word. */
export function BetaTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Tag variant="warn" className={className}><TriangleAlert aria-hidden="true" strokeWidth={1.75} />{children}</Tag>;
}

export { tagVariants };
