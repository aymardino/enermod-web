"use client";

import { cn } from "@/lib/utils";

/** Compact multi-select rendered as toggle chips (keeps the filters readable on phones). */
export function ChipGroup({ label, options, value, onChange, className, max }: {
  label: string; options: { value: string; label: string; n?: number }[]; value: string[]; onChange: (v: string[]) => void; className?: string; max?: number;
}) {
  const shown = max ? options.slice(0, max) : options;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((o) => (
          <button key={o.value} type="button" onClick={() => toggle(o.value)} aria-pressed={value.includes(o.value)}
            className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
              value.includes(o.value) ? "border-brand-600 bg-brand-600 text-white" : "border-border bg-card text-foreground hover:border-brand-400")}>
            {o.label}{o.n !== undefined && <span className={cn("tabular", value.includes(o.value) ? "text-white/80" : "text-muted-foreground")}>{o.n}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded border-border accent-brand-600" />
      {label}
    </label>
  );
}

export function YearRange({ min, max, value, onChange, label }: { min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void; label: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}: <span className="tabular text-foreground">{value[0]}–{value[1]}</span></p>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} value={value[0]} onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])} className="w-full accent-brand-600" aria-label={`${label} min`} />
        <input type="range" min={min} max={max} value={value[1]} onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])} className="w-full accent-brand-600" aria-label={`${label} max`} />
      </div>
    </div>
  );
}

/** Scope filter shared by the analytical pages (whole energy-system / focused / all). */
export function LevelFilter({ value, onChange, counts, labels }: { value: "full" | "light" | "all"; onChange: (v: "full" | "light" | "all") => void; counts: { full: number; light: number }; labels: { title: string; full: string; light: string; all: string; help: string } }) {
  const opts: { v: "full" | "light" | "all"; l: string; n: number }[] = [
    { v: "full", l: labels.full, n: counts.full }, { v: "light", l: labels.light, n: counts.light }, { v: "all", l: labels.all, n: counts.full + counts.light },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labels.title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} aria-pressed={value === o.v}
            className={cn("rounded-md border px-3 py-1.5 text-sm", value === o.v ? "border-brand-600 bg-brand-600 text-white" : "border-border hover:border-brand-400")}>
            {o.l} <span className={cn("tabular text-xs", value === o.v ? "text-white/80" : "text-muted-foreground")}>{o.n}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{labels.help}</p>
    </div>
  );
}
