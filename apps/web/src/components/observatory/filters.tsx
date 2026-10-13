"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogTrigger, SheetContent, SheetHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; n?: number };

/** Filter chips: square, 3.39:1 boundary; pressed = ink fill + check glyph + aria-pressed.
 *  Counts are live facet counts (tabular, muted; on ink when pressed). `max` shows only the first
 *  options; `limit` does the same with a "Show n more / Show fewer" toggle (selected options always
 *  stay visible). */
export function ChipGroup({ label, options, value, onChange, className, max, limit, hideLabel = false }: {
  label: string; options: Option[]; value: string[]; onChange: (v: string[]) => void; className?: string; max?: number; limit?: number; hideLabel?: boolean;
}) {
  const t = useTranslations("ui.filters");
  const format = useFormatter();
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  let shown = max ? options.slice(0, max) : options;
  const collapsible = limit !== undefined && shown.length > limit;
  if (collapsible && !open) shown = shown.filter((o, i) => i < limit || value.includes(o.value));
  const hidden = options.length - shown.length;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={cn("min-w-0", className)} role="group" aria-labelledby={`${id}-l`}>
      <p id={`${id}-l`} className={cn("field-label mb-2.5", hideLabel && "sr-only")}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            aria-pressed={value.includes(o.value)}
            className="group inline-flex h-[30px] max-w-full items-center gap-1.5 rounded-sm border border-input px-2.5 text-[13px] font-medium text-foreground hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:pl-2 aria-pressed:text-card"
          >
            <Check aria-hidden="true" strokeWidth={1.8} className="hidden size-[13px] shrink-0 group-aria-pressed:block" />
            <span className="truncate">{o.label}</span>
            {o.n !== undefined && <span className="tabular-nums text-muted-foreground group-aria-pressed:text-on-ink-muted">{format.number(o.n)}</span>}
          </button>
        ))}
      </div>
      {collapsible && (hidden > 0 || open) && (
        <button type="button" className="link mt-2 inline-block py-[3px] text-[13px]" aria-expanded={open} onClick={() => setOpen((x) => !x)}>
          {open ? t("less") : t("more", { n: hidden })}
        </button>
      )}
    </div>
  );
}

/** A checkbox row: square box, 14px label, at least 24px tall. */
export function Toggle({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn("inline-flex min-h-6 cursor-pointer items-center gap-[9px] text-sm leading-[1.35]", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="cbx focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
      {label}
    </label>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Publication years as two inputs: a four-digit year commits at once, anything else is
 *  restored on blur; values are clamped to [min, max] and kept in order. */
export function YearRange({ min, max, value, onChange, label, className }: { min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void; label: string; className?: string }) {
  const t = useTranslations("ui.filters");
  const id = React.useId();
  const [draft, setDraft] = React.useState<[string, string]>([String(value[0]), String(value[1])]);
  const [synced, setSynced] = React.useState(value);
  if (synced[0] !== value[0] || synced[1] !== value[1]) {
    setSynced(value);
    setDraft([String(value[0]), String(value[1])]);
  }
  const commit = (i: 0 | 1, raw: string, final: boolean) => {
    const s = raw.trim();
    if (!/^\d{4}$/.test(s)) {
      if (final) setDraft([String(value[0]), String(value[1])]);
      return;
    }
    let lo = clamp(i === 0 ? Number(s) : value[0], min, max);
    let hi = clamp(i === 1 ? Number(s) : value[1], min, max);
    if (lo > hi) { if (i === 0) hi = lo; else lo = hi; }
    if (lo !== value[0] || hi !== value[1]) onChange([lo, hi]);
    if (final) setDraft([String(lo), String(hi)]);
  };
  const field = (i: 0 | 1) => (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]{4}"
      maxLength={4}
      value={draft[i]}
      aria-label={`${label}, ${i === 0 ? t("from") : t("to")}`}
      onChange={(e) => {
        const next: [string, string] = i === 0 ? [e.target.value, draft[1]] : [draft[0], e.target.value];
        setDraft(next);
        commit(i, e.target.value, false);
      }}
      onBlur={(e) => commit(i, e.target.value, true)}
      onKeyDown={(e) => { if (e.key === "Enter") commit(i, e.currentTarget.value, true); }}
      className="h-[38px] w-full min-w-0 rounded-sm border border-input bg-card px-3 text-[14.5px] tabular-nums text-foreground focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    />
  );
  return (
    <div className={cn("min-w-0", className)} role="group" aria-labelledby={`${id}-l`}>
      <p id={`${id}-l`} className="field-label mb-2.5">{label}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        {field(0)}
        <span aria-hidden="true" className="text-muted-foreground">–</span>
        {field(1)}
      </div>
    </div>
  );
}

const tabClass =
  "inline-flex shrink-0 items-baseline whitespace-nowrap border-b-2 border-transparent px-0 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-foreground aria-pressed:text-foreground aria-checked:border-foreground aria-checked:text-foreground";

/** Scope switch shared by the analytical pages: underline tabs All / Whole energy-system /
 *  Focused with counts; it scrolls on phones. The help sentence, if any, sits under the tabs. */
export function LevelFilter({ value, onChange, counts, labels, className, hideHelp = false }: {
  value: "full" | "light" | "all"; onChange: (v: "full" | "light" | "all") => void; counts: { full: number; light: number };
  labels: { title: string; full: string; light: string; all: string; help?: string }; className?: string; hideHelp?: boolean;
}) {
  const format = useFormatter();
  const opts: { v: "full" | "light" | "all"; l: string; n: number }[] = [
    { v: "all", l: labels.all, n: counts.full + counts.light }, { v: "full", l: labels.full, n: counts.full }, { v: "light", l: labels.light, n: counts.light },
  ];
  return (
    <div className={cn("min-w-0", className)}>
      <div role="group" aria-label={labels.title} className="tabrow">
        {opts.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} aria-pressed={value === o.v} className={tabClass}>
            {o.l}<span className="ml-1.5 font-normal tabular-nums text-muted-foreground">{format.number(o.n)}</span>
          </button>
        ))}
      </div>
      {labels.help && !hideHelp && <p className="mt-3 max-w-[38em] text-[12.5px] leading-[1.45] text-muted-foreground">{labels.help}</p>}
    </div>
  );
}

/** Single choice drawn as underline tabs with radio semantics, e.g. the map's "Colour by":
 *  role="radiogroup", arrow keys move the choice. `wrap` lets the options wrap in a narrow column. */
export function RadioTabs({ label, options, value, onChange, className, hideLabel = false, wrap = false }: {
  label: string; options: Option[]; value: string; onChange: (v: string) => void; className?: string; hideLabel?: boolean; wrap?: boolean;
}) {
  const format = useFormatter();
  const id = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, step: number) => {
    const i = (from + step + options.length) % options.length;
    onChange(options[i].value);
    refs.current[i]?.focus();
  };
  return (
    <div className={cn("min-w-0", className)}>
      <p id={`${id}-l`} className={cn("field-label mb-1", hideLabel && "sr-only")}>{label}</p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-l`}
        className={cn(wrap ? "flex flex-wrap gap-x-5" : "tabrow")}
      >
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(i, 1); }
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(i, -1); }
              }}
              className={tabClass}
            >
              {o.label}
              {o.n !== undefined && <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">{format.number(o.n)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A labelled group inside a FilterPanel (select, checkboxes, anything that is not a ChipGroup). */
export function FilterGroup({ label, children, className }: { label?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && <p className="field-label mb-2.5">{label}</p>}
      {children}
    </div>
  );
}

/** Filters panel: a ruled left column (2px ink rule, "Filters" + Reset, groups separated by
 *  hairlines). Each direct child is one group (ChipGroup, YearRange, FilterGroup…). Below 1024px the
 *  column collapses into an outline "Filters (n)" button that opens a sheet with the same groups.
 *  `sticky` keeps the column in view on desktop (below the masthead and the sub-nav). */
export function FilterPanel({ children, activeCount = 0, onReset, doneLabel, title, sticky = false, className }: {
  children: React.ReactNode; activeCount?: number; onReset?: () => void; doneLabel?: string; title?: string; sticky?: boolean; className?: string;
}) {
  const t = useTranslations("ui.filters");
  const heading = title ?? t("title");
  const groups = <div className="*:border-b *:border-border *:pb-[18px] *:pt-4">{children}</div>;
  return (
    <div className={cn("min-w-0", className)}>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="lg:hidden"><SlidersHorizontal strokeWidth={1.5} aria-hidden="true" />{t("button", { n: activeCount })}</Button>
        </DialogTrigger>
        <SheetContent side="left" className="px-4 pb-0 pt-4" aria-describedby={undefined}>
          <SheetHeader title={heading} />
          <div className="flex-1">{groups}</div>
          <div className="sticky bottom-0 -mx-4 mt-4 flex items-center justify-between gap-3 border-t border-rule bg-background px-4 py-3">
            {onReset ? <button type="button" onClick={onReset} className="link py-1 text-[13px]">{t("reset")}</button> : <span />}
            <DialogClose asChild><Button size="sm">{doneLabel ?? t("done")}</Button></DialogClose>
          </div>
        </SheetContent>
      </Dialog>
      <aside
        aria-label={heading}
        className={cn("border-t-2 border-rule max-lg:hidden", sticky && "lg:sticky lg:top-[136px] lg:-mx-1 lg:max-h-[calc(100dvh-152px)] lg:overflow-y-auto lg:px-1")}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border py-3 text-[13px]">
          <span className="font-semibold">{heading}</span>
          {onReset && <button type="button" onClick={onReset} className="link py-[3px]">{t("reset")}</button>}
        </div>
        {groups}
      </aside>
    </div>
  );
}
