/** Public address of the site, for canonical URLs, the sitemap and social cards. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://enermod.africa").replace(/\/+$/, "");
export const REPO_URL = "https://github.com/aymardino/enermod-web";
export const LEGACY_REPO_URL = "https://github.com/aymardino/Enermod_Africa";
export const KRINEA_URL = "https://krinea.org";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
/** Public routes (path without locale prefix), for the sitemap. */
export const PUBLIC_ROUTES = ["", "/about", "/methodology", "/research", "/contribute", "/contact", "/privacy", "/legal",
  "/observatory", "/observatory/map", "/observatory/gaps", "/observatory/readiness", "/observatory/studies",
  "/observatory/tools", "/observatory/recommender"] as const;
export const localePath = (locale: string, path: string) => (locale === "en" ? path || "/" : `/${locale}${path}`);
