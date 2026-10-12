import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { PUBLIC_ROUTES, SITE_URL, localePath } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${localePath("en", path)}`,
    lastModified: now,
    changeFrequency: path === "" || path.startsWith("/observatory") ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/observatory") ? 0.8 : 0.5,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}${localePath(l, path)}`])) },
  }));
}
