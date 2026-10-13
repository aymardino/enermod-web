import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Card is a ruled block: a 2px ink rule on top, no box, no radius, no shadow.
 *  `variant="plate"` is the framed figure on sheet with the graduated band (recommender result,
 *  assistant panel). There is no white bordered rounded panel on paper anywhere. */
const cardVariants = cva("min-w-0 text-card-foreground", {
  variants: {
    variant: {
      block: "border-t-2 border-rule pt-3.5",
      plate: "plate",
    },
  },
  defaultVariants: { variant: "block" },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}

/** Title row: title and description left, actions (ghost xs "Table", "CSV") top right. */
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-[23px] font-semibold leading-[1.2] tracking-[-0.005em]", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 max-w-[46em] text-[13px] leading-[1.5] text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 min-w-0", className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex flex-wrap items-center gap-3", className)} {...props} />;
}

/** A plate: `<Plate fig="Fig. 4" title="Your shortlist" meta="3 tools">…</Plate>`. */
export function Plate({ fig, title, meta, children, className, ...props }: Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & { fig?: React.ReactNode; title?: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className={cn("plate min-w-0", className)} {...props}>
      {(fig || title || meta) && <PlateHeader fig={fig} title={title} meta={meta} />}
      {children}
    </div>
  );
}

/** Plate header: italic rubric "Fig. n", 18px title, small-caps meta on the right. */
export function PlateHeader({ fig, title, meta, className }: { fig?: React.ReactNode; title?: React.ReactNode; meta?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mt-1 flex items-baseline justify-between gap-2.5", className)}>
      <p className="min-w-0 font-display text-[18px] font-semibold leading-[1.25]">
        {fig && <span className="mr-2 text-[13px] font-semibold text-muted-foreground">{fig}</span>}
        {title}
      </p>
      {meta && <span className="sc shrink-0 text-[10.5px] text-muted-foreground">{meta}</span>}
    </div>
  );
}

export { cardVariants };
