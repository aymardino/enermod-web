import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Caption } from "@/components/observatory/kpi";
import { cn } from "@/lib/utils";

/* ── PRISMA 2020 flow diagram ────────────────────────────────────────────────────────────────
   The standard box-and-arrow layout of the review's figure (public/brand/prisma_flow.png): studies
   identified via databases on the left with their exclusions beside them, other methods on the
   right, phase labels down the left edge. Under 900px of figure width the boxes stack, each
   exclusion set inside its stage. In the Markdown, a fenced block with the language `prisma` holds
   the figures as `key: number` lines; the labels come from the messages (reading.prisma). */

export type PrismaData = Record<string, number>;

export function parsePrisma(text: string): PrismaData {
  const out: PrismaData = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_.]+)\s*:\s*(\d+)\s*$/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

/** Splits a Markdown source around its ```prisma block, so the figure can be laid out wider than
 *  the text. Without a block, `data` is null and `before` is the whole source. */
export function splitPrisma(source: string): { before: string; data: PrismaData | null; after: string } {
  const m = source.match(/^```prisma[ \t]*\n([\s\S]*?)^```[ \t]*$/m);
  if (!m || m.index === undefined) return { before: source, data: null, after: "" };
  return { before: source.slice(0, m.index), data: parsePrisma(m[1]), after: source.slice(m.index + m[0].length) };
}

const REASON_KEYS = ["scope", "private", "custom", "telecom", "duplicate", "etap", "notAfrica", "platform", "global", "sdNoSoftware", "language", "sdOneMarket", "deprecated"] as const;

/** Grid placement in the wide layout: columns are phase, spacer, databases, arrow, exclusions,
 *  spacer, other methods, arrow, other exclusions; rows are the headers then the five stages. */
const at = (column: number | string, row: number | string): React.CSSProperties => ({ gridColumn: column, gridRow: row });

function Box({ title, n, detail, className, children, style }: {
  title: React.ReactNode;
  n: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("pf-box", className)} style={style}>
      <p className="pf-t">{title}</p>
      <p className="pf-n">{n}</p>
      {detail && <p className="pf-d">{detail}</p>}
      {children}
    </div>
  );
}

/** Arrow glyphs drawn in CSS: `right` leaves a box towards its exclusion, `down` crosses the row
 *  gap below a cell, `line` is the same without a head, `left` enters the included box. */
function Arrow({ dir, className }: { dir: "right" | "down" | "line" | "left" | "sdown"; className?: string }) {
  return <span aria-hidden="true" className={cn(`pf-${dir}`, className)} />;
}

export function PrismaDiagram({ d }: { d: PrismaData }) {
  const t = useTranslations("reading.prisma");
  const format = useFormatter();
  const num = (k: string) => (d[k] === undefined ? "–" : format.number(d[k]));
  const n = (k: string) => t("n", { n: num(k) });
  const reasons = REASON_KEYS.filter((k) => d[`reason.${k}`] !== undefined);
  const other = d.other !== undefined;

  const sources = d["identified.openalex"] !== undefined ? t("sources", { openalex: num("identified.openalex"), scopus: num("identified.scopus") }) : undefined;
  const otherSources = d["other.inventory"] !== undefined ? t("otherSources", { inventory: num("other.inventory"), citations: num("other.citations") }) : undefined;
  const includedDetail = d["included.databases"] !== undefined ? t("includedDetail", { databases: num("included.databases"), other: num("included.other") }) : undefined;
  const reasonList = reasons.length > 0 && (
    <dl className="pf-reasons">
      {reasons.map((k) => (
        <div key={k}>
          <dt>{t(`reasons.${k}`)}</dt>
          <dd>{num(`reason.${k}`)}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <figure className="pf" role="group" aria-label={t("aria")}>
      {/* wide: the PRISMA 2020 template */}
      <div className="pf-grid">
        <p className="pf-head" style={at("3 / 6", 1)}>{t("headDatabases")}</p>
        {other && <p className="pf-head" style={at("7 / 10", 1)}>{t("headOther")}</p>}
        <p className="pf-phase" style={at(1, 2)}><span>{t("phaseIdentification")}</span></p>
        <p className="pf-phase" style={at(1, "3 / 6")}><span>{t("phaseScreening")}</span></p>
        <p className="pf-phase" style={at(1, 6)}><span>{t("phaseIncluded")}</span></p>

        <div className="pf-cell" style={at(3, 2)}>
          <Box title={t("identified")} n={n("identified")} detail={sources} className="flex-1"><Arrow dir="right" /></Box>
          <Arrow dir="down" />
        </div>
        <Box title={t("duplicates")} n={n("duplicates")} className="self-center" style={at(5, 2)} />

        <div className="pf-cell" style={at(3, 3)}>
          <Box title={t("screened")} n={n("screened")} className="flex-1"><Arrow dir="right" /></Box>
          <Arrow dir="down" />
        </div>
        <Box title={t("screenedExcluded")} n={n("screened.excluded")} className="self-center" style={at(5, 3)} />

        <div className="pf-cell" style={at(3, 4)}>
          <Box title={t("sought")} n={n("sought")} className="flex-1"><Arrow dir="right" /></Box>
          <Arrow dir="down" />
        </div>
        <Box title={t("notRetrieved")} n={n("sought.notRetrieved")} className="self-center" style={at(5, 4)} />

        <div className="pf-cell" style={at(3, 5)}>
          <Box title={t("assessed")} n={n("assessed")}><Arrow dir="right" /></Box>
          <span aria-hidden="true" className="pf-fill" />
          <Arrow dir="down" />
        </div>
        <Box title={t("assessedExcluded")} n={n("assessed.excluded")} className="pf-list self-start" style={at(5, 5)}>{reasonList}</Box>

        {other && (
          <>
            <Box title={t("other")} n={n("other")} detail={otherSources} style={at("7 / 10", 2)} />
            <div className="pf-span" style={at(7, "3 / 5")}><Arrow dir="down" className="pf-full" /></div>
            <div className="pf-cell" style={at(7, 5)}>
              <Box title={t("otherAssessed")} n={n("other")}><Arrow dir="right" className="pf-short" /></Box>
              <span aria-hidden="true" className="pf-fill" />
              <Arrow dir="line" />
            </div>
            <Box title={t("otherExcluded")} n={n("other.excluded")} className="self-start" style={at(9, 5)} />
            <span aria-hidden="true" className="pf-join" style={at(7, 6)} />
            <span aria-hidden="true" className="pf-left" style={at("4 / 7", 6)} />
          </>
        )}

        <Box title={t("included")} n={n("included")} detail={includedDetail} className="pf-in" style={at(3, 6)} />
      </div>

      {/* narrow: the same stages stacked, each exclusion inside its stage */}
      <div className="pf-stack">
        <p className="pf-head">{t("headDatabases")}</p>
        <p className="pf-sphase">{t("phaseIdentification")}</p>
        <Box title={t("identified")} n={n("identified")} detail={sources}>
          <div className="pf-sub"><p className="pf-t">{t("duplicates")}</p><p className="pf-n">{n("duplicates")}</p></div>
        </Box>
        <Arrow dir="sdown" />
        <p className="pf-sphase">{t("phaseScreening")}</p>
        <Box title={t("screened")} n={n("screened")}>
          <div className="pf-sub"><p className="pf-t">{t("screenedExcluded")}</p><p className="pf-n">{n("screened.excluded")}</p></div>
        </Box>
        <Arrow dir="sdown" />
        <Box title={t("sought")} n={n("sought")}>
          <div className="pf-sub"><p className="pf-t">{t("notRetrieved")}</p><p className="pf-n">{n("sought.notRetrieved")}</p></div>
        </Box>
        <Arrow dir="sdown" />
        <Box title={t("assessed")} n={n("assessed")}>
          <div className="pf-sub pf-list"><p className="pf-t">{t("assessedExcluded")}</p><p className="pf-n">{n("assessed.excluded")}</p>{reasonList}</div>
        </Box>
        {other && (
          <>
            <p className="pf-head mt-7">{t("headOther")}</p>
            <Box title={t("other")} n={n("other")} detail={otherSources} className="mt-3" />
            <Arrow dir="sdown" />
            <Box title={t("otherAssessed")} n={n("other")}>
              <div className="pf-sub"><p className="pf-t">{t("otherExcluded")}</p><p className="pf-n">{n("other.excluded")}</p></div>
            </Box>
          </>
        )}
        <Arrow dir="sdown" />
        <p className="pf-sphase">{t("phaseIncluded")}</p>
        <Box title={t("included")} n={n("included")} detail={includedDetail} className="pf-in" />
      </div>

      <Caption className="mt-4">
        {t("caption")}{" "}
        <a href="/brand/prisma_flow.png" download className="link whitespace-nowrap">{t("download")}</a>
      </Caption>
    </figure>
  );
}
