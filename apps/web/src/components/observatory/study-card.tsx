"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { StudyCard as StudyCardT } from "@/lib/api";
import { useLabel } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";

export function StudyCard({ s, compact = false }: { s: StudyCardT; compact?: boolean }) {
  const label = useLabel();
  const t = useTranslations("observatory.studies");
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-brand-400">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/observatory/studies/${s.study_id}`} className="font-display text-[1.02rem] font-semibold leading-snug hover:text-brand-800 dark:hover:text-brand-200">{s.title}</Link>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">#{s.study_id}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{s.authors}{s.year ? ` · ${s.year}` : ""}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant={s.level === "full" ? "brand" : "secondary"}>{label("level", s.level)}</Badge>
        {s.scale && <Badge variant="outline">{label("scale", s.scale)}</Badge>}
        {s.open_source && <Badge variant="outline">{label("open_source", s.open_source)}</Badge>}
        {s.local_ownership === "yes" && <Badge variant="outline">{label("origin", "african_led")}</Badge>}
        {s.grey_literature === "yes" && <Badge variant="outline">{label("grey", "yes")}</Badge>}
        {s.source !== "review" && <Badge variant="outline">{label("source", s.source)}</Badge>}
      </div>
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {s.tools.length > 0 && <span>{t("tools")}: {s.tools.map((x, i) => <span key={x}>{i ? ", " : ""}<Link href={`/observatory/tools/${encodeURIComponent(x)}`} className="hover:text-primary hover:underline">{x}</Link></span>)}</span>}
          <span>{t("countries")}: {s.countries.length > 12 ? t("nCountries", { n: s.countries.length }) : s.countries.map((c, i) => <span key={c}>{i ? ", " : ""}<Link href={`/observatory/countries/${c}`} className="hover:text-primary hover:underline">{c}</Link></span>)}</span>
          {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary"><ExternalLink className="size-3" />{t("source")}</a>}
        </div>
      )}
    </article>
  );
}
