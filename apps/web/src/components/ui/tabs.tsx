"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/** Underline tabs: a hairline under the list, a 2px ink underline under the active tab,
 *  no background, no shadow. The list scrolls on phones without a visible scrollbar. */
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn("tabrow h-auto text-muted-foreground", className)}
      {...props}
    />
  ),
);
TabsList.displayName = "TabsList";
const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-baseline whitespace-nowrap border-b-2 border-transparent px-0 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-foreground data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
TabsTrigger.displayName = "TabsTrigger";
const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", className)} {...props} />,
);
TabsContent.displayName = "TabsContent";

/** Count after a tab label: `<TabsTrigger value="x">Studies<TabCount>274</TabCount></TabsTrigger>`. */
function TabCount({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-1.5 font-normal tabular-nums text-muted-foreground", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabCount };
