import { cn } from "@/lib/utils";

export function Kpi({ label, value, hint, className, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string; tone?: "brand" | "coral" | "amber" }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-card", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-3xl font-semibold tabular", tone === "brand" && "text-brand-700 dark:text-brand-300", tone === "coral" && "text-coral-700", tone === "amber" && "text-amber-700")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Section({ title, lede, children, className, actions }: { title: React.ReactNode; lede?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("mt-10", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
          {lede && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{lede}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Callout({ children, tone = "amber", className }: { children: React.ReactNode; tone?: "amber" | "brand" | "coral"; className?: string }) {
  return (
    <div className={cn("rounded-lg border-l-4 px-4 py-3 text-sm leading-relaxed",
      tone === "amber" && "border-amber-500 bg-amber-100/60 text-amber-700 dark:bg-amber-700/15 dark:text-amber-100",
      tone === "brand" && "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-100",
      tone === "coral" && "border-coral-500 bg-coral-100/60 text-coral-700 dark:bg-coral-700/15 dark:text-coral-100", className)}>
      {children}
    </div>
  );
}

export function BetaBanner({ text }: { text: string }) {
  return <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-100/60 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-700/15 dark:text-amber-100">⚠ {text}</div>;
}
