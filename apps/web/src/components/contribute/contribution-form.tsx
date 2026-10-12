"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type Facets } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Kind = "study" | "correction" | "tool";
type Done = { id: string; duplicate_of: number | null; kind: Kind };

const LEVELS = ["full", "light"];
const SCALES = ["national", "subnational", "regional", "continental"];
const LICENCES = ["open", "proprietary", "mixed"];
const OWNERSHIP = ["yes", "partial", "no"];
const CATEGORIES = ["long_term_planning", "rural_electrification", "microgrid", "dispatch", "nexus", "economic", "geospatial"];

function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-coral-500"> *</span>}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Choice({ value, onChange, options, label: lab, group, empty }: { value: string; onChange: (v: string) => void; options: string[]; label: (g: string, v: string) => string; group: string; empty: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
      <option value="">{empty}</option>
      {options.map((o) => <option key={o} value={o}>{lab(group, o)}</option>)}
    </select>
  );
}

export function ContributionForm({ initialKind = "study", targetStudyId, targetToolName }: { initialKind?: Kind; targetStudyId?: number; targetToolName?: string }) {
  const t = useTranslations("contribute");
  const c = useTranslations("common");
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
      <div className="rounded-2xl border border-brand-300 bg-brand-50 p-6 dark:bg-brand-950">
        <p className="flex items-center gap-2 font-display text-xl font-semibold"><CheckCircle2 className="size-5 text-brand-700" />{t("thanksTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("thanksText")}</p>
        {done.duplicate_of && <p className="mt-3 text-sm">{t("duplicate")} <Link href={`/observatory/studies/${done.duplicate_of}`} className="text-primary underline">#{done.duplicate_of}</Link></p>}
        <Button className="mt-5" variant="outline" onClick={() => setDone(null)}>{t("another")}</Button>
      </div>
    );
  }

  const countryOptions = facets.data?.countries ?? [];
  return (
    <form onSubmit={submit} className="space-y-6">
      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="study">{t("kinds.study")}</TabsTrigger>
          <TabsTrigger value="correction">{t("kinds.correction")}</TabsTrigger>
          <TabsTrigger value="tool">{t("kinds.tool")}</TabsTrigger>
        </TabsList>
        <TabsContent value="study" className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("studyIntro")}</p>
          <Field label={t("f.title")} required><Input required value={study.full_title} onChange={(e) => setStudy({ ...study, full_title: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("f.doi")} hint={t("f.doiHint")}><Input value={study.link_doi} onChange={(e) => setStudy({ ...study, link_doi: e.target.value })} placeholder="https://doi.org/10…" /></Field>
            <Field label={t("f.year")}><Input type="number" min={1990} max={2100} value={study.year} onChange={(e) => setStudy({ ...study, year: e.target.value })} /></Field>
          </div>
          <Field label={t("f.authors")}><Input value={study.authors} onChange={(e) => setStudy({ ...study, authors: e.target.value })} placeholder="Doe J., Mensah K." /></Field>
          <Field label={t("f.affiliation")}><Input value={study.authors_affiliation} onChange={(e) => setStudy({ ...study, authors_affiliation: e.target.value })} /></Field>
          <Field label={t("f.tools")} hint={t("f.toolsHint")} required><Input required value={study.tools} onChange={(e) => setStudy({ ...study, tools: e.target.value })} placeholder="OSeMOSYS, OnSSET" list="tool-list" />
            <datalist id="tool-list">{facets.data?.tools.map((o) => <option key={o.value} value={o.value} />)}</datalist></Field>
          <Field label={t("f.countries")} hint={t("f.countriesHint")} required>
            <select multiple required value={study.countries} onChange={(e) => setStudy({ ...study, countries: Array.from(e.target.selectedOptions).map((o) => o.value) })} className="h-40 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
              {countryOptions.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("f.level")}><Choice value={study.extraction_level} onChange={(v) => setStudy({ ...study, extraction_level: v })} options={LEVELS} label={label} group="level" empty={c("choose")} /></Field>
            <Field label={t("f.scale")}><Choice value={study.scale} onChange={(v) => setStudy({ ...study, scale: v })} options={SCALES} label={label} group="scale" empty={c("choose")} /></Field>
            <Field label={t("f.licence")}><Choice value={study.open_source} onChange={(v) => setStudy({ ...study, open_source: v })} options={LICENCES} label={label} group="open_source" empty={c("choose")} /></Field>
            <Field label={t("f.category")}><Choice value={study.study_category} onChange={(v) => setStudy({ ...study, study_category: v })} options={CATEGORIES} label={label} group="category" empty={c("choose")} /></Field>
            <Field label={t("f.ownership")}><Choice value={study.local_ownership} onChange={(v) => setStudy({ ...study, local_ownership: v })} options={OWNERSHIP} label={label} group="ownership" empty={c("choose")} /></Field>
            <Field label={t("f.grey")}><Choice value={study.grey_literature} onChange={(v) => setStudy({ ...study, grey_literature: v })} options={["yes", "no"]} label={label} group="yesno" empty={c("choose")} /></Field>
          </div>
          <Field label={t("f.objective")}><Textarea value={study.study_objective} onChange={(e) => setStudy({ ...study, study_objective: e.target.value })} /></Field>
          <Field label={t("f.result")}><Textarea value={study.key_result} onChange={(e) => setStudy({ ...study, key_result: e.target.value })} /></Field>
          <Field label={t("f.message")}><Textarea value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        </TabsContent>
        <TabsContent value="correction" className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("correctionIntro")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("f.studyId")}><Input type="number" value={correction.target} onChange={(e) => setCorrection({ ...correction, target: e.target.value })} placeholder="123" /></Field>
            <Field label={t("f.toolName")}><Input value={correction.tool} onChange={(e) => setCorrection({ ...correction, tool: e.target.value })} list="tool-list" /></Field>
          </div>
          <Field label={t("f.correction")} required><Textarea required value={correction.message} onChange={(e) => setCorrection({ ...correction, message: e.target.value })} rows={6} /></Field>
        </TabsContent>
        <TabsContent value="tool" className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("toolIntro")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("f.toolName")} required><Input required value={tool.tool_name} onChange={(e) => setTool({ ...tool, tool_name: e.target.value })} /></Field>
            <Field label={t("f.fullName")}><Input value={tool.full_name} onChange={(e) => setTool({ ...tool, full_name: e.target.value })} /></Field>
            <Field label={t("f.toolLicence")}><Choice value={tool.license} onChange={(v) => setTool({ ...tool, license: v })} options={["open_source", "free", "freemium", "proprietary", "internal"]} label={label} group="license" empty={c("choose")} /></Field>
            <Field label={t("f.toolType")}><Choice value={tool.type} onChange={(v) => setTool({ ...tool, type: v })} options={["capacity_expansion", "production_cost", "geospatial_electrification", "reliability", "nexus", "demand_forecast", "system_dynamics", "hybrid_optimization", "simulation", "accounting", "other"]} label={label} group="type" empty={c("choose")} /></Field>
            <Field label={t("f.website")}><Input value={tool.website_url} onChange={(e) => setTool({ ...tool, website_url: e.target.value })} placeholder="https://" /></Field>
            <Field label={t("f.repo")}><Input value={tool.repo_url} onChange={(e) => setTool({ ...tool, repo_url: e.target.value })} placeholder="https://github.com/…" /></Field>
            <Field label={t("f.institution")}><Input value={tool.origin_institution} onChange={(e) => setTool({ ...tool, origin_institution: e.target.value })} /></Field>
            <Field label={t("f.bestFor")}><Input value={tool.best_for} onChange={(e) => setTool({ ...tool, best_for: e.target.value })} /></Field>
          </div>
          <Field label={t("f.strengths")}><Textarea value={tool.strengths} onChange={(e) => setTool({ ...tool, strengths: e.target.value })} /></Field>
          <Field label={t("f.weaknesses")}><Textarea value={tool.weaknesses} onChange={(e) => setTool({ ...tool, weaknesses: e.target.value })} /></Field>
          <Field label={t("f.message")}><Textarea value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        </TabsContent>
      </Tabs>

      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">{t("you")}</legend>
        <p className="mb-3 text-xs text-muted-foreground">{me ? t("signedAs", { email: me.email }) : t("youHint")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("f.name")}><Input value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} autoComplete="name" /></Field>
          <Field label={t("f.email")}><Input type="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} autoComplete="email" /></Field>
          <Field label={t("f.org")}><Input value={who.org} onChange={(e) => setWho({ ...who, org: e.target.value })} autoComplete="organization" /></Field>
        </div>
        <input type="text" value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" name="website" />
      </fieldset>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("consent")}</p>
      <Button type="submit" size="lg" disabled={busy}>{busy ? c("sending") : t("submit")}</Button>
    </form>
  );
}
