/** Human-readable labels for the harmonised codes of the inventory. The translations live
 *  in messages/<locale>.json under "labels"; unknown codes are humanised (snake_case -> words). */
import { useTranslations } from "next-intl";

export function humanize(v: string | null | undefined): string {
  if (!v) return "";
  return String(v).replace(/_/g, " ").replace(/;/g, " · ").replace(/,/g, " · ").replace(/\s+·\s+/g, " · ").trim();
}

export function useLabel() {
  const t = useTranslations("labels");
  return (group: string, value: string | null | undefined): string => {
    if (value === null || value === undefined || value === "") return t("notAssessed");
    const key = `${group}.${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    return t.has(key) ? t(key) : humanize(String(value));
  };
}

export function useListLabel() {
  const label = useLabel();
  return (group: string, value: string | null | undefined): string =>
    String(value ?? "").split(/[;,]/).map((x) => x.trim()).filter(Boolean).map((x) => label(group, x)).join(" · ") || label(group, "");
}
