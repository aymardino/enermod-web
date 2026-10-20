/** Thin typed client for the EnerMod API. Cookies carry the session. By default the browser
 *  goes through this app's own `/api` proxy (same origin, no CORS). Set NEXT_PUBLIC_API_URL only
 *  to call a separately hosted API directly. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const detail = typeof data === "object" && data && "detail" in data ? (data as { detail: unknown }).detail : text;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
  url: (path: string) => `${API_URL}${path}`,
};

export function qs(params: Record<string, string | number | boolean | string[] | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ── Types mirroring the API responses ────────────────────────────────────────────
export type User = { id: string; email: string; name: string; organisation: string; locale: string; role: string; created_at: string; email_verified: boolean; has_password: boolean };

export type Origin = { assessed: number; african_led: number; mixed: number; non_african: number; african_led_pct: number; mixed_pct: number; non_african_pct: number };
export type YearRow = { year: number; studies: number; full: number; light: number };
export type OriginMapRow = { iso2: string; iso3: string; n: number; name: string; group: "africa" | "outside" };
export type Overview = {
  n_studies: number; n_full: number; n_light: number; year_min: number; year_max: number; n_countries: number; countries_covered: number;
  n_tools: number; n_tools_used: number; origin: Origin; african_led_full_pct: number; african_led_light_pct: number; open_pct: number;
  open_assessed: number; grey: number; by_year: YearRow[]; origin_map: OriginMapRow[]; top_tools: { tool: string; studies: number }[];
  latest: { study_id: number; title: string; year: number | null; tools: string[]; source: string }[];
  pools: { code: string; name: string; studies: number }[]; regions: string[];
};
export type Coverage = { key: string; positive: number; assessed: number; total: number; pct: number };
export type CountrySummary = {
  iso_code: string; iso3: string; country_name: string; region: string; power_pool: string; language: string; energy_governance: string;
  rise_governance_score: number | null; data_availability: string; data_transparency_score: number | null; electrification_rate: number;
  electrification_year: number | null; has_ndc: string; has_lts: string; n_studies: number; n_full: number; n_light: number; n_tools: number;
  feature_ratio: number; gap_score: number; readiness_score: number | null; african_led: number;
};
export type StudyCard = {
  study_id: number; title: string; authors: string; year: number | null; model_name: string; tools: string[]; countries: string[]; scale: string;
  level: string; open_source: string; local_ownership: string; study_category: string; link: string; source: string; grey_literature: string;
};
export type CountryDetail = CountrySummary & {
  by_year: YearRow[]; tools: { tool: string; studies: number }[]; scales: Record<string, number>; categories: Record<string, number>;
  origin: Origin; features: Coverage[]; national_studies: number; pool: { pool_code: string; pool_name: string; member_countries: string } | null;
  studies: StudyCard[];
};
export type Gaps = {
  level: string; n_studies: number; features: Coverage[]; feature_median: number; origin: Origin; origin_map: OriginMapRow[]; n_map_studies: number;
  gap_map: { iso2: string; iso3: string; name: string; gap_score: number; n_studies: number; region: string }[];
  financing: { n_rates: number; mode_rate: number; mode_share: number; n_varied: number; n_not_stated: number; financing_pct: number; financing_positive: number; financing_assessed: number; n_mechanisms: number; rate_distribution: { rate: number; studies: number }[] };
  emerging: { agenda_2063: Coverage; grey_literature: Coverage };
  top_gap: { iso2: string; name: string; region: string; power_pool: string; n_studies: number; gap_score: number; data_availability: string; energy_governance: string; electrification_rate: number }[];
};
export type Readiness = { n_countries: number; n_ranked: number; average: number; n_below_4: number; n_good_data: number; n_strong_gov: number; n_lts: number; distribution: { range: string; countries: number }[]; countries: CountrySummary[] };
export type Study = StudyCard & Record<string, unknown> & {
  full_title: string; country_names: string[]; pools: string[]; study_objective: string; key_result: string; strengths: string; weaknesses: string;
  tool_profiles: { tool_name: string; license: string; type: string }[]; doi: string; link_doi: string;
};
export type StudyPage = { items: StudyCard[]; total: number; page: number; page_size: number; pages: number };
export type Facets = {
  year_min: number; year_max: number; scale: { value: string; n: number }[]; approach: { value: string; n: number }[]; method: { value: string; n: number }[];
  open_source: { value: string; n: number }[]; level: { value: string; n: number }[]; study_category: { value: string; n: number }[]; sector: { value: string; n: number }[];
  aisesa_theme: { value: string; n: number }[]; tools: { value: string; n: number }[]; countries: { value: string; name: string; n: number }[];
  pools: { value: string; name: string }[]; tech: string[]; features: string[];
};
export type ToolMetrics = { stars: number | null; forks: number | null; open_issues: number | null; contributors: number | null; last_commit_at: string | null; repo_license: string; language: string; archived: boolean; fetched_at: string; repo_url: string };
export type ToolRow = {
  tool_name: string; full_name: string; type: string; license: string; cost_usd: string; free_for_developing: string; programming_required: string; learning_curve: string;
  time_horizon: string; scale: string; data_intensity: string; best_for: string; origin_institution: string; origin_country: string; repo_url: string; website_url: string;
  tracker_url: string; nb_studies_in_inventory: number; n_studies: number; sparkline: number[]; span: [number, number]; recent: number; metrics: ToolMetrics | null; views_30d: number;
};
export type ToolDetail = ToolRow & Record<string, unknown> & {
  doc_quality: string; training_available: string; community: string; helpdesk: string; os: string; clean_cooking_capable: string; financing_modelling: string;
  proprietary_dependency: string; info_source: string; info_date: string; strengths: string; weaknesses: string; typical_results: string; often_linked: string;
  by_year: YearRow[]; countries: { iso2: string; iso3: string; name: string; studies: number }[]; scales: Record<string, number>; levels: Record<string, number>;
  origin: Origin; co_used: { tool: string; studies: number }[]; studies: StudyCard[]; metrics_history: { fetched_at: string; stars: number | null; forks: number | null }[];
};
export type RecommendOptions = { objectives: string[]; scales: string[]; horizons: string[]; budgets: string[]; capacities: string[]; data: string[]; extras: string[]; allowed: Record<string, [string[], string[]]>; weights: string };
export type Recommendation = ToolRow & { score: number; breakdown: Record<string, number>; strengths: string; weaknesses: string; info_source: string; info_date: string; proprietary_dependency: string };
export type RecommendResult = { results: Recommendation[]; n_ranked: number; n_internal: number; open_only: boolean; weights: string };
export type Citation = { type: "study" | "tool" | "country"; id: string; label: string; href: string };
export type ChatAnswer = { answer: string; citations: Citation[]; ok: boolean; provider: string; model: string };
export type Contribution = {
  id: string; kind: string; status: string; source: string; created_at: string; reviewed_at: string | null; created_study_id: number | null; target_study_id: number | null;
  target_tool_name: string; match_study_id: number | null; match_note: string; title: string; payload?: Record<string, unknown>; message?: string; submitter_name?: string;
  submitter_email?: string; submitter_org?: string; review_note?: string; errors?: string[];
};
export type Candidate = { id: number; openalex_id: string; doi: string; title: string; abstract: string; authors: string; year: number | null; venue: string; url: string; oa_url: string; cited_by: number; work_type: string; status: string; match_study_id: number | null; match_score: number | null; note: string; created_at: string };
export type Job = { id: string; kind: string; status: string; payload: Record<string, unknown>; result: Record<string, unknown>; error: string; created_at: string; finished_at: string | null };
export type AdminOverview = {
  pending_contributions: number; new_candidates: number; relevant_candidates: number; users: number; last_metrics_at: string | null;
  last_discovery: { id: string; status: string; started_at: string; n_new: number; n_fetched: number; since: string } | null; jobs: Job[];
  usage: Analytics;
};
export type Analytics = {
  days: number; events: number; visitors: number; by_kind: Record<string, number>; locales: Record<string, number>; pages: { path: string; n: number }[];
  daily: { day: string; n: number }[]; tools: { ref: string; n: number }[]; studies: { ref: string; n: number }[]; countries: { ref: string; n: number }[];
  downloads: { ref: string; n: number }[]; chat: { n: number; failed: number; recent: { question: string; ok: boolean; provider: string; locale: string; at: string; n_citations: number }[] };
};
