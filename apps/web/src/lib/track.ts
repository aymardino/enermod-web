"use client";

import { api } from "@/lib/api";

/** Privacy-friendly usage events: kind, path and a reference, nothing about the person. */
export function track(kind: string, ref = "", path?: string) {
  if (typeof window === "undefined") return;
  try {
    if (navigator.doNotTrack === "1") return;
    const locale = document.documentElement.lang || "";
    void api.post("/events", { kind, ref: String(ref ?? ""), path: path ?? window.location.pathname, locale }).catch(() => undefined);
  } catch {
    /* analytics must never break the page */
  }
}
