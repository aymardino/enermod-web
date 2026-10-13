"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type Facets } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { FieldHint, Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Kind = "study" | "correction" | "tool";
type Done = { id: string; duplicate_of: number | null; kind: Kind };

const KINDS: Kind[] = ["study", "correction", "tool"];
const LEVELS = ["full", "light"];
const SCALES = ["national", "subnational", "regional", "continental"];
const LICENCES = ["open", "proprietary", "mixed"];
const OWNERSHIP = ["yes", "partial", "no"];
const CATEGORIES = ["long_term_planning", "rural_electrification", "microgrid", "dispatch", "nexus", "economic", "geospatial"];
const TOOL_LICENCES = ["open_source", "free", "freemium", "proprietary", "internal"];
const TOOL_TYPES = ["capacity_expansion", "production_cost", "geospatial_electrification", "reliability", "nexus", "demand_forecast", "system_dynamics", "hybrid_optimization", "simulation", "accounting", "other"];

/** One numbered section of the ruled form: a 2px rule, a rubric numeral and a small-caps title. */
function FormSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="float-left w-full border-t-2 border-rule pt-3 text-[12.5px] font-semibold uppercase leading-[1.35] tracking-[0.11em] text-foreground">
        <span aria-hidden="true" className="text-rubric">{n} · </span>
        {title}
      </legend>
      <div className="clear-both pt-5">{children}</div>
    </fieldset>
  );
}

/** A labelled control: field label 7px above, help text under it (linked by aria-describedby on the control). */
function Field({ id, label, children, hint, required, className }: { id: string; label: string; children: React.ReactNode; hint?: string; required?: boolean; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true" className="text-rubric"> *</span>}
      </Label>
      {children}
      {hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
    </div>
  );
}

/** Single choice drawn as chips: pressed = ink + check glyph + aria-pressed; pressing the
 *  chosen chip again clears the answer (every one of these fields is optional). */
function ChoiceChips({ value, onChange, options, label, group }: { value: string; onChange: (v: string) => void; options: string[]; label: string; group: string }) {
  const lab = useLabel();
  const id = useId();
  return (
    <div role="group" aria-labelledby={`${id}-l`} className="min-w-0">
      <p id={`${id}-l`} className="field-label mb-[9px]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? "" : o)}
              className="group inline-flex h-[30px] max-w-full items-center gap-1.5 rounded-sm border border-input px-2.5 text-[13px] font-medium text-foreground hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:pl-2 aria-pressed:text-card"
            >
              <Check aria-hidden="true" strokeWidth={1.8} className="hidden size-[13px] shrink-0 group-aria-pressed:block" />
              <span className="truncate">{lab(group, o)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ContributionForm({ initialKind = "study", targetStudyId, targetToolName }: { initialKind?: Kind; targetStudyId?: number; targetToolName?: string }) {
  const t = useTranslations("contribute");
  const c = useTranslations("common");
  const u = useTranslations("ui.study");
  const locale = useLocale();
  const label = useLabel();
  const { data: me } = useMe();
  const facets = useQuery<Facets>({ queryKey: ["facets"], queryFn: () => api.get("/studies/facets"), staleTime: 600_000 });
  const [kind, setKind] = useState<Kind>(initialKind);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [who, setWho] = useState({ name: "", email: "", org: "" });
  const [study, setStudy] = useState({ full_title: "", link_doi: "", year: "", authors: "", tools: "", countries: [] as string[], scale: "", extraction_level: "", open_source: "", study_category: "", local_ownership: "", study_objective: "", key_result: "", authors_affiliation: "", grey_literature: "" });
  const [correction, setCorrection] = useState({ target: targetStudyId ? String(targetStudyId) : "", tool: targetToolName ?? "", message: "" });
  const [tool, setTool] = useState({ tool_name: "", full_name: "", license: "", type: "", website_url: "", repo_url: "", best_for: "", origin_institution: "", strengths: "", weaknesses: "" });
  const [message, setMessage] = useState("");
  const [honey, setHoney] = useState("");
  const receivedRef = useRef<HTMLHeadingElement>(null);

  // move focus to the confirmation so screen readers announce it
  useEffect(() => {
    if (done) receivedRef.current?.focus();
  }, [done]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const base = { submitter_name: who.name || me?.name || "", submitter_email: who.email || me?.email || "", submitter_org: who.org || me?.organisation || "", locale, website: honey };
      let body: Record<string, unknown>;
      if (kind === "study") {
        body = { ...base, kind, message, payload: { ...study, year: study.year || null, tools: study.tools.split(/[,;]/).map((x) => x.trim()).filter(Boolean) } };
      } else if (kind === "correction") {
        body = { ...base, kind, message: correction.message, target_study_id: correction.target ? Number(correction.target) : null, target_tool_name: correction.tool, payload: {} };
      } else {
        body = { ...base, kind, message, payload: tool };
      }
      const r = await api.post<Done>("/contributions", body);
      track("contribute", kind);
      setDone({ ...r, kind });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : c("error"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section aria-labelledby="contribution-received" className="border-l-2 border-rubric py-1 pl-5">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
          {t("reference")}{" "}
          <span className="ml-1 text-[13px] normal-case tracking-[0.04em] text-rubric tabular-nums">C-{done.id.replace(/-/g, "").slice(0, 8).toUpperCase()}</span>
        </p>
        <h2 id="contribution-received" ref={receivedRef} tabIndex={-1} className="mt-2 font-display text-[30px] font-bold leading-[1.12] tracking-[-0.015em] focus:outline-none">
          {t("received")}
        </h2>
        <p className="mt-3 max-w-[36em] font-display text-[17px] leading-[1.5] text-ink-2">{t("thanksTitle")} {t("thanksText")}</p>
        {done.duplicate_of && (
          <p className="mt-3 text-[14px] leading-[1.5] text-ink-2">
            {t("duplicate")}{" "}
            <Link href={`/observatory/studies/${done.duplicate_of}`} className="link font-semibold tabular-nums">
              <span aria-hidden="true">{u("no")} </span>{done.duplicate_of}
            </Link>
          </p>
        )}
        <Button className="mt-6" variant="outline" onClick={() => setDone(null)}>{t("another")}</Button>
      </section>
    );
  }

  const countryOptions = facets.data?.countries ?? [];
  return (
    <form onSubmit={submit} className="space-y-11">
      <FormSection n={1} title={t("step.kind")}>
        <div className="-mt-2 border-b border-border">
          {KINDS.map((k) => (
            <label key={k} className="flex cursor-pointer items-start gap-3.5 border-t border-border py-3.5 first:border-t-0">
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="mt-[3px] size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-card checked:border-[5px] checked:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <span className="min-w-0">
                <span className="block text-[15px] font-medium leading-[1.35] text-foreground">{t(`kinds.${k}`)}</span>
                <span className="mt-1 block text-[13.5px] leading-[1.45] text-muted-foreground">{t(`${k}Intro`)}</span>
              </span>
            </label>
          ))}
        </div>
      </FormSection>

      <FormSection n={2} title={t(`step.${kind}`)}>
        <p className="-mt-1 mb-5 text-[12.5px] leading-[1.45] text-muted-foreground">{t("requiredNote")}</p>
        {kind === "study" && (
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <Field id="cf-title" label={t("f.title")} required className="md:col-span-2">
              <Input id="cf-title" required value={study.full_title} onChange={(e) => setStudy({ ...study, full_title: e.target.value })} />
            </Field>
            <Field id="cf-doi" label={t("f.doi")} hint={t("f.doiHint")}>
              <Input id="cf-doi" aria-describedby="cf-doi-hint" value={study.link_doi} onChange={(e) => setStudy({ ...study, link_doi: e.target.value })} placeholder="https://doi.org/10…" />
            </Field>
            <Field id="cf-year" label={t("f.year")}>
              <Input id="cf-year" type="number" inputMode="numeric" min={1990} max={2100} value={study.year} onChange={(e) => setStudy({ ...study, year: e.target.value })} />
            </Field>
            <Field id="cf-authors" label={t("f.authors")}>
              <Input id="cf-authors" value={study.authors} onChange={(e) => setStudy({ ...study, authors: e.target.value })} placeholder="Doe J., Mensah K." />
            </Field>
            <Field id="cf-affiliation" label={t("f.affiliation")}>
              <Input id="cf-affiliation" value={study.authors_affiliation} onChange={(e) => setStudy({ ...study, authors_affiliation: e.target.value })} />
            </Field>
            <Field id="cf-tools" label={t("f.tools")} hint={t("f.toolsHint")} required className="md:col-span-2">
              <Input id="cf-tools" aria-describedby="cf-tools-hint" required value={study.tools} onChange={(e) => setStudy({ ...study, tools: e.target.value })} placeholder="OSeMOSYS, OnSSET" list="tool-list" />
            </Field>
            <Field id="cf-countries" label={t("f.countries")} hint={t("f.countriesHint")} required className="md:col-span-2">
              <select
                id="cf-countries"
                aria-describedby="cf-countries-hint"
                multiple
                required
                value={study.countries}
                onChange={(e) => setStudy({ ...study, countries: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                className="scrollbar-thin block h-44 w-full min-w-0 rounded-sm border border-input bg-card p-1 text-[14.5px] text-foreground focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>option]:rounded-[1px] [&>option]:px-2 [&>option]:py-[3px]"
              >
                {countryOptions.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
              </select>
            </Field>
            <ChoiceChips label={t("f.level")} value={study.extraction_level} onChange={(v) => setStudy({ ...study, extraction_level: v })} options={LEVELS} group="level" />
            <ChoiceChips label={t("f.scale")} value={study.scale} onChange={(v) => setStudy({ ...study, scale: v })} options={SCALES} group="scale" />
            <ChoiceChips label={t("f.licence")} value={study.open_source} onChange={(v) => setStudy({ ...study, open_source: v })} options={LICENCES} group="open_source" />
            <ChoiceChips label={t("f.ownership")} value={study.local_ownership} onChange={(v) => setStudy({ ...study, local_ownership: v })} options={OWNERSHIP} group="ownership" />
            <div className="md:col-span-2">
              <ChoiceChips label={t("f.category")} value={study.study_category} onChange={(v) => setStudy({ ...study, study_category: v })} options={CATEGORIES} group="category" />
            </div>
            <ChoiceChips label={t("f.grey")} value={study.grey_literature} onChange={(v) => setStudy({ ...study, grey_literature: v })} options={["yes", "no"]} group="yesno" />
            <Field id="cf-objective" label={t("f.objective")} className="md:col-span-2">
              <Textarea id="cf-objective" value={study.study_objective} onChange={(e) => setStudy({ ...study, study_objective: e.target.value })} />
            </Field>
            <Field id="cf-result" label={t("f.result")} className="md:col-span-2">
              <Textarea id="cf-result" value={study.key_result} onChange={(e) => setStudy({ ...study, key_result: e.target.value })} />
            </Field>
            <Field id="cf-message" label={t("f.message")} className="md:col-span-2">
              <Textarea id="cf-message" value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
          </div>
        )}
        {kind === "correction" && (
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <Field id="cf-study-id" label={t("f.studyId")}>
              <Input id="cf-study-id" type="number" inputMode="numeric" value={correction.target} onChange={(e) => setCorrection({ ...correction, target: e.target.value })} placeholder="123" />
            </Field>
            <Field id="cf-tool-name" label={t("f.toolName")}>
              <Input id="cf-tool-name" value={correction.tool} onChange={(e) => setCorrection({ ...correction, tool: e.target.value })} list="tool-list" />
            </Field>
            <Field id="cf-correction" label={t("f.correction")} required className="md:col-span-2">
              <Textarea id="cf-correction" required value={correction.message} onChange={(e) => setCorrection({ ...correction, message: e.target.value })} rows={6} />
            </Field>
          </div>
        )}
        {kind === "tool" && (
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <Field id="cf-tool" label={t("f.toolName")} required>
              <Input id="cf-tool" required value={tool.tool_name} onChange={(e) => setTool({ ...tool, tool_name: e.target.value })} />
            </Field>
            <Field id="cf-full-name" label={t("f.fullName")}>
              <Input id="cf-full-name" value={tool.full_name} onChange={(e) => setTool({ ...tool, full_name: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ChoiceChips label={t("f.toolLicence")} value={tool.license} onChange={(v) => setTool({ ...tool, license: v })} options={TOOL_LICENCES} group="license" />
            </div>
            <Field id="cf-type" label={t("f.toolType")}>
              <NativeSelect id="cf-type" value={tool.type} onChange={(e) => setTool({ ...tool, type: e.target.value })}>
                <option value="">{c("choose")}</option>
                {TOOL_TYPES.map((o) => <option key={o} value={o}>{label("type", o)}</option>)}
              </NativeSelect>
            </Field>
            <Field id="cf-best-for" label={t("f.bestFor")}>
              <Input id="cf-best-for" value={tool.best_for} onChange={(e) => setTool({ ...tool, best_for: e.target.value })} />
            </Field>
            <Field id="cf-website" label={t("f.website")}>
              <Input id="cf-website" value={tool.website_url} onChange={(e) => setTool({ ...tool, website_url: e.target.value })} placeholder="https://" />
            </Field>
            <Field id="cf-repo" label={t("f.repo")}>
              <Input id="cf-repo" value={tool.repo_url} onChange={(e) => setTool({ ...tool, repo_url: e.target.value })} placeholder="https://github.com/…" />
            </Field>
            <Field id="cf-institution" label={t("f.institution")} className="md:col-span-2">
              <Input id="cf-institution" value={tool.origin_institution} onChange={(e) => setTool({ ...tool, origin_institution: e.target.value })} />
            </Field>
            <Field id="cf-strengths" label={t("f.strengths")}>
              <Textarea id="cf-strengths" value={tool.strengths} onChange={(e) => setTool({ ...tool, strengths: e.target.value })} />
            </Field>
            <Field id="cf-weaknesses" label={t("f.weaknesses")}>
              <Textarea id="cf-weaknesses" value={tool.weaknesses} onChange={(e) => setTool({ ...tool, weaknesses: e.target.value })} />
            </Field>
            <Field id="cf-tool-message" label={t("f.message")} className="md:col-span-2">
              <Textarea id="cf-tool-message" value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
          </div>
        )}
        <datalist id="tool-list">{facets.data?.tools.map((o) => <option key={o.value} value={o.value} />)}</datalist>
      </FormSection>

      <FormSection n={3} title={t("you")}>
        <p className="-mt-1 mb-5 max-w-[44em] text-[13.5px] leading-[1.5] text-muted-foreground">{me ? t("signedAs", { email: me.email }) : t("youHint")}</p>
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
          <Field id="cf-name" label={t("f.name")}>
            <Input id="cf-name" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} autoComplete="name" />
          </Field>
          <Field id="cf-email" label={t("f.email")}>
            <Input id="cf-email" type="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} autoComplete="email" />
          </Field>
          <Field id="cf-org" label={t("f.org")}>
            <Input id="cf-org" value={who.org} onChange={(e) => setWho({ ...who, org: e.target.value })} autoComplete="organization" />
          </Field>
        </div>
        <input type="text" value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" name="website" />
      </FormSection>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-rule pt-5 max-md:flex-col max-md:items-stretch">
        <Button type="submit" size="lg" disabled={busy} className="max-md:w-full">{busy ? c("sending") : t("submit")}</Button>
        <p className="min-w-0 flex-1 basis-[18em] font-display text-[14.5px] leading-[1.45] text-muted-foreground max-md:basis-auto">{t("consent")}</p>
      </div>
    </form>
  );
}
