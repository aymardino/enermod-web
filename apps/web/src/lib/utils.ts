import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** A path inside the site to continue to after signing in; anything else (another host, the
 *  API, control characters) falls back to the contribute page. Mirrors safe_next() in the API. */
export function safeNext(value: string | null | undefined, fallback = "/contribute"): string {
  const p = (value ?? "").trim();
  return /^\/(?!\/)[^\s\\]*$/.test(p) && !p.startsWith("/api") && !/^\/[^?]*:/.test(p) ? p.slice(0, 500) : fallback;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string | null | undefined, locale = "en"): string {
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m ${(s % 60).toString().padStart(2, "0")}s`;
}

export function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}
