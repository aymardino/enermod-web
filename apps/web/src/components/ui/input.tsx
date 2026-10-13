import * as React from "react";
import { cn } from "@/lib/utils";

/** Inputs and textareas: sheet fill, 3.39:1 control boundary, ink border + lapis outline on focus. */
const fieldBase =
  "w-full min-w-0 rounded-sm border border-input bg-card px-3 text-[14.5px] text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      fieldBase,
      "flex h-[38px] text-ellipsis py-0 placeholder:text-ellipsis file:mr-3 file:h-full file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea className={cn(fieldBase, "block h-auto min-h-28 py-2.5 leading-relaxed", className)} ref={ref} {...props} />
));
Textarea.displayName = "Textarea";

/** Help and error text under a control (12.5px; errors in the destructive colour). */
function FieldHint({ className, error = false, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { error?: boolean }) {
  return <p className={cn("mt-1.5 text-[12.5px] leading-[1.45]", error ? "text-destructive" : "text-muted-foreground", className)} {...props} />;
}

export { Input, Textarea, FieldHint };
