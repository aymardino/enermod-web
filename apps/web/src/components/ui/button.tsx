import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Square ink button. One ink primary per view; the alternative action is a text link
 *  (`variant="link"`) or an outline button. Arrows go after the label. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-transparent text-[14.5px] font-medium leading-none tracking-[0.005em] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-800",
        outline: "border-foreground bg-transparent text-foreground hover:bg-muted",
        secondary: "bg-muted text-foreground hover:bg-sand-200",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        link: "h-auto min-h-6 px-0 text-foreground underline decoration-link decoration-1 underline-offset-4 hover:text-link hover:decoration-2",
        destructive: "bg-destructive text-destructive-foreground hover:bg-coral-700",
      },
      size: {
        xs: "h-7 px-2.5 text-[12.5px]",
        sm: "h-8 px-3 text-[13px]",
        default: "h-[38px] px-4",
        lg: "h-[46px] px-[22px] text-[15.5px]",
        icon: "size-[38px] px-0",
      },
    },
    compoundVariants: [
      // a text link never takes a box height or padding, whatever size it is given
      { variant: "link", size: ["xs", "sm", "default", "lg"], className: "h-auto px-0" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
