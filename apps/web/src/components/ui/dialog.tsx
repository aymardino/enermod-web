"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

/** Overlay: ink at 40%, no blur; it fades. */
const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay ref={ref} className={cn("em-overlay fixed inset-0 z-50 bg-[rgb(31_27_22/0.4)]", className)} {...props} />
  ),
);
DialogOverlay.displayName = "DialogOverlay";

/** Close button: ink X with the focus outline. */
function CloseX({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <DialogPrimitive.Close
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <X className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only">{t("close")}</span>
    </DialogPrimitive.Close>
  );
}

/** Dialog: sheet fill, ink rule border, popover shadow, square corners. */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { wide?: boolean; hideClose?: boolean }
>(({ className, children, wide, hideClose = false, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "em-dialog fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-sm border border-rule bg-card p-6 text-card-foreground shadow-pop focus-visible:outline-none",
        wide ? "max-w-3xl" : "max-w-lg",
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && <CloseX className="absolute right-3 top-3" />}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col gap-1.5 pr-8 text-left", className)} {...props} />;
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn("font-display text-[21px] font-semibold leading-[1.2] tracking-[-0.005em]", className)} {...props} />,
);
DialogTitle.displayName = "DialogTitle";
const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-[13.5px] leading-[1.5] text-muted-foreground", className)} {...props} />,
);
DialogDescription.displayName = "DialogDescription";

/** Sheet: a paper panel from one edge. `side="top"` is the full-height mobile menu;
 *  `side="left"` holds the filter groups below 1024px. Put a SheetHeader (title + close) first. */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "top" | "left" | "right" | "bottom" }
>(({ className, children, side = "top", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "em-sheet fixed z-50 flex flex-col overflow-y-auto bg-background text-foreground focus-visible:outline-none",
        side === "top" && "em-sheet-top inset-0 h-[100dvh]",
        side === "bottom" && "em-sheet-bottom inset-x-0 bottom-0 max-h-[90dvh] border-t border-rule",
        side === "left" && "em-sheet-left inset-y-0 left-0 h-[100dvh] w-[min(380px,calc(100vw-2.5rem))] border-r border-rule",
        side === "right" && "em-sheet-right inset-y-0 right-0 h-[100dvh] w-[min(380px,calc(100vw-2.5rem))] border-l border-rule",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

/** Sheet header row: a 13px 600 title and the ink close X, over a 2px rule. */
function SheetHeader({ title, className }: { title: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b-2 border-rule pb-2.5", className)}>
      <DialogPrimitive.Title className="font-sans text-[13px] font-semibold tracking-normal">{title}</DialogPrimitive.Title>
      <CloseX className="-mr-1.5" />
    </div>
  );
}

export {
  Dialog, DialogTrigger, DialogClose, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
  SheetContent, SheetHeader,
};
