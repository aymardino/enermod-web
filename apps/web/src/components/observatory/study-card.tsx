"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { StudyCard as StudyCardT } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { Key, Tag, type KeyKind } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** The 54 countries of the inventory: ISO2 (as stored on studies) → ISO3, power pool, EN and FR
 *  names. Static reference data, so study entries can print "Cameroon · CAPP" and "CMR" without
 *  a request and without locale-dependent Intl output that could differ between server and client. */
export const AFRICA_COUNTRIES: Record<string, { iso3: string; pool: string; en: string; fr: string }> = {
  DZ: { iso3: "DZA", pool: "COMELEC", en: "Algeria", fr: "Algérie" },
  AO: { iso3: "AGO", pool: "SAPP", en: "Angola", fr: "Angola" },
  BJ: { iso3: "BEN", pool: "WAPP", en: "Benin", fr: "Bénin" },
  BW: { iso3: "BWA", pool: "SAPP", en: "Botswana", fr: "Botswana" },
  BF: { iso3: "BFA", pool: "WAPP", en: "Burkina Faso", fr: "Burkina Faso" },
  BI: { iso3: "BDI", pool: "EAPP", en: "Burundi", fr: "Burundi" },
  CM: { iso3: "CMR", pool: "CAPP", en: "Cameroon", fr: "Cameroun" },
  CV: { iso3: "CPV", pool: "WAPP", en: "Cape Verde", fr: "Cap-Vert" },
  CF: { iso3: "CAF", pool: "CAPP", en: "Central African Republic", fr: "République centrafricaine" },
  TD: { iso3: "TCD", pool: "CAPP", en: "Chad", fr: "Tchad" },
  KM: { iso3: "COM", pool: "EAPP", en: "Comoros", fr: "Comores" },
  CD: { iso3: "COD", pool: "SAPP", en: "Democratic Republic of the Congo", fr: "République démocratique du Congo" },
  DJ: { iso3: "DJI", pool: "EAPP", en: "Djibouti", fr: "Djibouti" },
  EG: { iso3: "EGY", pool: "EAPP", en: "Egypt", fr: "Égypte" },
  GQ: { iso3: "GNQ", pool: "CAPP", en: "Equatorial Guinea", fr: "Guinée équatoriale" },
  ER: { iso3: "ERI", pool: "EAPP", en: "Eritrea", fr: "Érythrée" },
  SZ: { iso3: "SWZ", pool: "SAPP", en: "Eswatini", fr: "Eswatini" },
  ET: { iso3: "ETH", pool: "EAPP", en: "Ethiopia", fr: "Éthiopie" },
  GA: { iso3: "GAB", pool: "CAPP", en: "Gabon", fr: "Gabon" },
  GM: { iso3: "GMB", pool: "WAPP", en: "Gambia", fr: "Gambie" },
  GH: { iso3: "GHA", pool: "WAPP", en: "Ghana", fr: "Ghana" },
  GN: { iso3: "GIN", pool: "WAPP", en: "Guinea", fr: "Guinée" },
  GW: { iso3: "GNB", pool: "WAPP", en: "Guinea-Bissau", fr: "Guinée-Bissau" },
  CI: { iso3: "CIV", pool: "WAPP", en: "Ivory Coast", fr: "Côte d’Ivoire" },
  KE: { iso3: "KEN", pool: "EAPP", en: "Kenya", fr: "Kenya" },
  LS: { iso3: "LSO", pool: "SAPP", en: "Lesotho", fr: "Lesotho" },
  LR: { iso3: "LBR", pool: "WAPP", en: "Liberia", fr: "Liberia" },
  LY: { iso3: "LBY", pool: "COMELEC", en: "Libya", fr: "Libye" },
  MG: { iso3: "MDG", pool: "EAPP", en: "Madagascar", fr: "Madagascar" },
  MW: { iso3: "MWI", pool: "SAPP", en: "Malawi", fr: "Malawi" },
  ML: { iso3: "MLI", pool: "WAPP", en: "Mali", fr: "Mali" },
  MR: { iso3: "MRT", pool: "COMELEC", en: "Mauritania", fr: "Mauritanie" },
  MU: { iso3: "MUS", pool: "EAPP", en: "Mauritius", fr: "Maurice" },
  MA: { iso3: "MAR", pool: "COMELEC", en: "Morocco", fr: "Maroc" },
  MZ: { iso3: "MOZ", pool: "SAPP", en: "Mozambique", fr: "Mozambique" },
  NA: { iso3: "NAM", pool: "SAPP", en: "Namibia", fr: "Namibie" },
  NE: { iso3: "NER", pool: "WAPP", en: "Niger", fr: "Niger" },
  NG: { iso3: "NGA", pool: "WAPP", en: "Nigeria", fr: "Nigeria" },
  CG: { iso3: "COG", pool: "CAPP", en: "Republic of the Congo", fr: "République du Congo" },
  RW: { iso3: "RWA", pool: "EAPP", en: "Rwanda", fr: "Rwanda" },
  ST: { iso3: "STP", pool: "CAPP", en: "Sao Tome and Principe", fr: "Sao Tomé-et-Principe" },
  SN: { iso3: "SEN", pool: "WAPP", en: "Senegal", fr: "Sénégal" },
  SC: { iso3: "SYC", pool: "EAPP", en: "Seychelles", fr: "Seychelles" },
  SL: { iso3: "SLE", pool: "WAPP", en: "Sierra Leone", fr: "Sierra Leone" },
  SO: { iso3: "SOM", pool: "EAPP", en: "Somalia", fr: "Somalie" },
  ZA: { iso3: "ZAF", pool: "SAPP", en: "South Africa", fr: "Afrique du Sud" },
  SS: { iso3: "SSD", pool: "EAPP", en: "South Sudan", fr: "Soudan du Sud" },
  SD: { iso3: "SDN", pool: "EAPP", en: "Sudan", fr: "Soudan" },
  TZ: { iso3: "TZA", pool: "EAPP", en: "Tanzania", fr: "Tanzanie" },
  TG: { iso3: "TGO", pool: "WAPP", en: "Togo", fr: "Togo" },
  TN: { iso3: "TUN", pool: "COMELEC", en: "Tunisia", fr: "Tunisie" },
  UG: { iso3: "UGA", pool: "EAPP", en: "Uganda", fr: "Ouganda" },
  ZM: { iso3: "ZMB", pool: "SAPP", en: "Zambia", fr: "Zambie" },
  ZW: { iso3: "ZWE", pool: "SAPP", en: "Zimbabwe", fr: "Zimbabwe" },
};

/** ISO3, pool and the localised name of a country code as stored on studies (ISO2). Unknown codes
 *  fall back to the code itself. */
export function countryInfo(code: string, locale: string): { iso2: string; iso3: string; pool: string; name: string } {
  const c = AFRICA_COUNTRIES[code.toUpperCase()];
  if (!c) return { iso2: code, iso3: code, pool: "", name: code };
  return { iso2: code.toUpperCase(), iso3: c.iso3, pool: c.pool, name: locale === "fr" ? c.fr : c.en };
}

const ORIGIN: Record<string, { key: KeyKind; label: "african_led" | "mixed" | "non_african" }> = {
  yes: { key: "africa", label: "african_led" },
  partial: { key: "mixed", label: "mixed" },
  no: { key: "outside", label: "non_african" },
};

function useStudyBits(s: StudyCardT) {
  const label = useLabel();
  const locale = useLocale();
  const u = useTranslations("ui.study");
  const countries = (s.countries ?? []).map((c) => countryInfo(c, locale));
  const origin = ORIGIN[s.local_ownership ?? ""];
  const tags: { key?: KeyKind; text: string }[] = [];
  if (s.level === "full" || s.level === "light") tags.push({ key: s.level, text: label("level", s.level) });
  if (s.scale) tags.push({ text: label("scale", s.scale) });
  if (s.open_source) tags.push({ text: s.open_source === "mixed" ? u("mixedLicence") : label("open_source", s.open_source) });
  if (s.grey_literature === "yes") tags.push({ text: label("grey", "yes") });
  if (origin) tags.push({ key: origin.key, text: origin.label === "mixed" ? u("mixedTeam") : label("origin", origin.label) });
  if (s.source && s.source !== "review") tags.push({ text: label("source", s.source) });
  const meta = [s.year ? String(s.year) : "", countries.length === 1 ? countries[0].iso3 : ""].filter(Boolean).join(" · ");
  return { countries, tags, meta, no: u("no") };
}

function ToolLinks({ tools }: { tools: string[] }) {
  return (
    <>
      {tools.map((x, i) => (
        <React.Fragment key={x}>
          {i > 0 && ", "}
          <Link href={`/observatory/tools/${encodeURIComponent(x)}`} className="link">{x}</Link>
        </React.Fragment>
      ))}
    </>
  );
}

function CountryLinks({ countries, many }: { countries: ReturnType<typeof countryInfo>[]; many: string }) {
  if (countries.length > 12) return <>{many}</>;
  return (
    <>
      {countries.map((c, i) => (
        <React.Fragment key={c.iso2}>
          {i > 0 && ", "}
          <Link href={`/observatory/countries/${c.iso2}`} className="link">{c.name}</Link>
          {c.pool && <span className="text-muted-foreground"> · {c.pool}</span>}
        </React.Fragment>
      ))}
    </>
  );
}

/** A study.
 *  - full entry (default): number and "2023 · CMR" on top, title, italic authors · year,
 *    tags with keys, a ruled list of tools and countries, the source pinned to the bottom. Lay several
 *    out with `<StudyEntries>` (columns separated by hairlines under a 2px rule).
 *  - `compact`: the ledger row of /observatory/studies, about 40% of the entry's height. Stack them in
 *    `<StudyLedger>`. */
export function StudyCard({ s, compact = false, className }: { s: StudyCardT; compact?: boolean; className?: string }) {
  const t = useTranslations("observatory.studies");
  const { countries, tags, meta, no } = useStudyBits(s);
  const href = `/observatory/studies/${s.study_id}`;
  const number = (
    <span className="font-semibold tabular-nums tracking-[0.04em] text-rubric">
      <span aria-hidden="true">{no}{"\u00a0"}</span>
      {s.study_id}
    </span>
  );

  if (compact) {
    const hasRight = s.tools.length > 0 || countries.length > 0;
    return (
      <article className={cn("@container min-w-0 border-b border-border pb-4 pt-[15px]", className)}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-1 @min-[620px]:grid-cols-[96px_minmax(0,1fr)_minmax(0,190px)]">
          <p className="text-xs leading-[1.5] tabular-nums tracking-[0.03em] text-muted-foreground">
            <span className="mr-2 inline @min-[620px]:mr-0 @min-[620px]:block">{number}</span>
            {meta}
          </p>
          <div className="min-w-0">
            <h3 className="font-display text-[18.5px] font-semibold leading-[1.28] tracking-[-0.003em]">
              <Link href={href} className="no-underline decoration-link decoration-1 underline-offset-4 hover:underline">{s.title}</Link>
            </h3>
            {s.authors && <p className="mt-[3px] font-display text-[14.5px] text-ink-2">{s.authors}</p>}
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
                {tags.map((x) => <Tag key={x.text} variant="plain">{x.key && <Key kind={x.key} />}{x.text}</Tag>)}
              </div>
            )}
          </div>
          {hasRight && (
            <div className="min-w-0 text-[13px] leading-[1.6] text-muted-foreground">
              {s.tools.length > 0 && <p><span>{t("tools")}</span> <span className="text-foreground"><ToolLinks tools={s.tools} /></span></p>}
              {countries.length > 0 && <p className="text-foreground"><CountryLinks countries={countries} many={t("nCountries", { n: countries.length })} /></p>}
            </div>
          )}
        </div>
      </article>
    );
  }

  const byline = [s.authors, s.year ? String(s.year) : ""].filter(Boolean).join(" · ");
  const source = s.link ? s.link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "";
  return (
    <article className={cn("study-entry flex min-w-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2.5 text-xs">
        {number}
        {meta && <span className="tabular-nums tracking-[0.04em] text-muted-foreground">{meta}</span>}
      </div>
      <h3 className="mt-2.5 font-display text-[21px] font-semibold leading-[1.24] tracking-[-0.005em]">
        <Link href={href} className="no-underline decoration-link decoration-1 underline-offset-4 hover:underline">{s.title}</Link>
      </h3>
      {byline && <p className="mt-[7px] font-display text-[15px] text-ink-2">{byline}</p>}
      {tags.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {tags.map((x) => <Tag key={x.text}>{x.key && <Key kind={x.key} />}{x.text}</Tag>)}
        </div>
      )}
      {(s.tools.length > 0 || countries.length > 0) && (
        <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-[5px] border-t border-border pt-3 text-[13px]">
          {s.tools.length > 0 && <><dt className="text-muted-foreground">{t("tools")}</dt><dd><ToolLinks tools={s.tools} /></dd></>}
          {countries.length > 0 && <><dt className="text-muted-foreground">{t("countries")}</dt><dd><CountryLinks countries={countries} many={t("nCountries", { n: countries.length })} /></dd></>}
        </dl>
      )}
      {s.link && (
        <p className="mt-auto min-w-0 pt-4 text-[13px]">
          <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 font-medium no-underline hover:text-link">
            <ExternalLink className="size-[13px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">{t("source")} · {source}</span>
          </a>
        </p>
      )}
    </article>
  );
}

/** Full entries side by side (, home "Latest additions"): a 2px ink rule on top, columns
 *  separated by 1px hairlines; 3 columns (2 below 1024px, 1 on phones). */
export function StudyEntries({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("study-entries", className)}>{children}</div>;
}

/** Compact ledger rows: rows separated by hairlines; `ruled` adds the 2px ink rule on top
 *  (leave it off when a list header above already carries the rule). */
export function StudyLedger({ children, className, ruled = true }: { children: React.ReactNode; className?: string; ruled?: boolean }) {
  return <div className={cn("min-w-0", ruled && "border-t-2 border-rule", className)}>{children}</div>;
}
