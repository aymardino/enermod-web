"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Download, Search as SearchIcon } from "lucide-react";
import { api, qs, type Facets, type StudyPage } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { ChipGroup, Toggle, YearRange } from "@/components/observatory/filters";
import { StudyCard } from "@/components/observatory/study-card";

export default function StudiesPage() {
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8"><Skeleton className="h-96" /></div>}><Studies /></Suspense>;
}

function Studies() {
  const t = useTranslations("observatory.studies");
  const c = useTranslations("common");
  const label = useLabel();
  const sp = useSearchParams();
  const facets = useQuery<Facets>({ queryKey: ["facets"], queryFn: () => api.get("/studies/facets"), staleTime: 600_000 });
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [debounced, setDebounced] = useState(q);
  // The year range defaults to the facets' bounds until the visitor moves a slider.
  const [yearsPicked, setYears] = useState<[number, number] | null>(null);
  const yearMin = facets.data?.year_min ?? 2000;
  const yearMax = facets.data?.year_max ?? 2026;
  const years = useMemo<[number, number]>(() => yearsPicked ?? [yearMin, yearMax], [yearsPicked, yearMin, yearMax]);
  const [levels, setLevels] = useState<string[]>(sp.getAll("level"));
  const [scales, setScales] = useState<string[]>(sp.getAll("scale"));
  const [approaches, setApproaches] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [lics, setLics] = useState<string[]>(sp.getAll("open_source"));
  const [cats, setCats] = useState<string[]>(sp.getAll("category"));
  const [countries, setCountries] = useState<string[]>(sp.getAll("country"));
  const [tools, setTools] = useState<string[]>(sp.getAll("tool"));
  const [features, setFeatures] = useState<string[]>([]);
  const [techs, setTechs] = useState<string[]>([]);
  const [flags, setFlags] = useState({ sdg7: false, sdg13: false, ndc: false, local: false, grey: false });
  const [sort, setSort] = useState(sp.get("sort") ?? "year_desc");
  // Pagination is scoped to the current filter set: changing any filter brings the list back to page 1.
  const filterKey = JSON.stringify([debounced, years, levels, scales, approaches, methods, lics, cats, countries, tools, features, techs, flags, sort]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });
  const [showAllTools, setShowAllTools] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  useEffect(() => { const h = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(h); }, [q]);
  useEffect(() => { if (debounced) track("search", debounced.slice(0, 80)); }, [debounced]);
  const query = useMemo(() => qs({
    q: debounced, year_min: years[0], year_max: years[1], level: levels, scale: scales, approach: approaches, method: methods, open_source: lics,
    category: cats, country: countries, tool: tools, feature: features, tech: techs, sdg7: flags.sdg7, sdg13: flags.sdg13, ndc: flags.ndc, local: flags.local,
    grey: flags.grey ? "true" : undefined, sort, page, page_size: 25,
  }), [debounced, years, levels, scales, approaches, methods, lics, cats, countries, tools, features, techs, flags, sort, page]);
  const data = useQuery<StudyPage>({ queryKey: ["studies", query], queryFn: () => api.get(`/studies${query}`), placeholderData: (prev) => prev });
  const f = facets.data;
  const reset = () => { setQ(""); setLevels([]); setScales([]); setApproaches([]); setMethods([]); setLics([]); setCats([]); setCountries([]); setTools([]); setFeatures([]); setTechs([]); setFlags({ sdg7: false, sdg13: false, ndc: false, local: false, grey: false }); setYears(null); };
  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1><p className="mt-2 max-w-3xl text-muted-foreground">{t("lede")}</p></div>
        <Button variant="outline" asChild><a href={api.url("/export/studies.csv")} onClick={() => track("download", "studies.csv")}><Download />{t("download")}</a></Button>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-card lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:self-start">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">{t("filters")}</p><button type="button" onClick={reset} className="text-xs text-primary hover:underline">{c("reset")}</button></div>
          {f && <YearRange min={f.year_min} max={f.year_max} value={years} onChange={setYears} label={t("year")} />}
          <ChipGroup label={t("scope")} value={levels} onChange={setLevels} options={(f?.level ?? []).map((o) => ({ value: o.value, label: label("level", o.value), n: o.n }))} />
          <ChipGroup label={t("scale")} value={scales} onChange={setScales} options={(f?.scale ?? []).map((o) => ({ value: o.value, label: label("scale", o.value), n: o.n }))} />
          <ChipGroup label={t("category")} value={cats} onChange={setCats} options={(f?.study_category ?? []).map((o) => ({ value: o.value, label: label("category", o.value), n: o.n }))} />
          <ChipGroup label={t("licence")} value={lics} onChange={setLics} options={(f?.open_source ?? []).map((o) => ({ value: o.value, label: label("open_source", o.value), n: o.n }))} />
          <ChipGroup label={t("approach")} value={approaches} onChange={setApproaches} options={(f?.approach ?? []).map((o) => ({ value: o.value, label: label("approach", o.value), n: o.n }))} />
          <ChipGroup label={t("method")} value={methods} onChange={setMethods} options={(f?.method ?? []).map((o) => ({ value: o.value, label: label("method", o.value), n: o.n }))} />
          <div>
            <ChipGroup label={t("tools")} value={tools} onChange={setTools} options={(f?.tools ?? []).map((o) => ({ value: o.value, label: o.value, n: o.n }))} max={showAllTools ? undefined : 12} />
            <button type="button" className="mt-1.5 text-xs text-primary hover:underline" onClick={() => setShowAllTools((v) => !v)}>{showAllTools ? t("less") : t("more", { n: (f?.tools.length ?? 0) - 12 })}</button>
          </div>
          <div>
            <ChipGroup label={t("countries")} value={countries} onChange={setCountries} options={(f?.countries ?? []).slice().sort((a, b) => b.n - a.n).map((o) => ({ value: o.value, label: o.name, n: o.n }))} max={showAllCountries ? undefined : 10} />
            <button type="button" className="mt-1.5 text-xs text-primary hover:underline" onClick={() => setShowAllCountries((v) => !v)}>{showAllCountries ? t("less") : t("more", { n: (f?.countries.length ?? 0) - 10 })}</button>
          </div>
          <ChipGroup label={t("features")} value={features} onChange={setFeatures} options={[...(f?.features ?? []), "clean_cooking"].map((x) => ({ value: x, label: label("feature", x) }))} />
          <ChipGroup label={t("tech")} value={techs} onChange={setTechs} options={(f?.tech ?? []).map((x) => ({ value: x, label: label("tech", x) }))} />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("policy")}</p>
            <div className="flex flex-col gap-1.5">
              <Toggle label={t("sdg7")} checked={flags.sdg7} onChange={(v) => setFlags({ ...flags, sdg7: v })} />
              <Toggle label={t("sdg13")} checked={flags.sdg13} onChange={(v) => setFlags({ ...flags, sdg13: v })} />
              <Toggle label={t("ndc")} checked={flags.ndc} onChange={(v) => setFlags({ ...flags, ndc: v })} />
              <Toggle label={t("local")} checked={flags.local} onChange={(v) => setFlags({ ...flags, local: v })} />
              <Toggle label={t("grey")} checked={flags.grey} onChange={(v) => setFlags({ ...flags, grey: v })} />
            </div>
          </div>
        </aside>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]"><SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-9" /></div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
              <option value="year_desc">{t("sort.yearDesc")}</option><option value="year_asc">{t("sort.yearAsc")}</option><option value="title">{t("sort.title")}</option><option value="recent">{t("sort.recent")}</option><option value="id">{t("sort.id")}</option>
            </select>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{data.data ? t("showing", { n: data.data.total }) : c("loading")}</p>
          <div className="mt-3 space-y-3">
            {data.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}
            {data.data && data.data.items.length === 0 && <EmptyState title={t("empty")} description={t("emptyHint")} action={<Button variant="outline" onClick={reset}>{c("reset")}</Button>} />}
            {data.data?.items.map((s) => <StudyCard key={s.study_id} s={s} />)}
          </div>
          {data.data && data.data.pages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{c("previous")}</Button>
              <span className="text-muted-foreground">{c("page")} {page} {c("of")} {data.data.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.data.pages} onClick={() => setPage(page + 1)}>{c("next")}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
