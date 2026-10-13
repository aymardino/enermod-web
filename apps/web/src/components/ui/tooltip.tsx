"use client";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

/** Ink tooltip: 12.5px sheet text on ink, square, no shadow, 80 ms fade.
 *  Optional first line ("NGA · WAPP"): `<TooltipCode>`. */
const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn("em-tip z-50 max-w-xs rounded-sm bg-foreground px-[9px] py-[5px] text-[12.5px] leading-[1.4] text-card", className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = "TooltipContent";

/** First line of an ink tooltip: 11px 600, tracking 0.06em, muted on ink. */
function TooltipCode({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("block text-[11px] font-semibold tracking-[0.06em] text-on-ink-muted", className)} {...props} />;
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipCode };
