import { PageBanner, type BannerImage } from "@/components/marketing/page-banner";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Caption } from "@/components/observatory/kpi";
import { cn } from "@/lib/utils";

/* ── Reading pages (about, methodology, research, privacy, legal), ──────────────────────
   A 176px margin column with the sticky "On this page" contents (italic rubric numbers, generated
   from the h2s), then the 680px article: rubric kicker, 48px h1, lede, numbered h2s. */

export type TocItem = { id: string; text: string };

/** Typographic pass over running text (never code): typographic apostrophes, curly quotes in
 *  English, and in French the narrow no-break space (U+202F) before ; : ! ? », after «, inside
 *  thousands ("9 582") and before %. The Markdown sources keep plain ASCII. */
export function typeset(s: string, locale: string): string {
  let r = s.replace(/([A-Za-zÀ-ÖØ-öø-ÿŒœ])'([A-Za-zÀ-ÖØ-öø-ÿŒœ])/g, "$1’$2");
  if (locale === "fr") {
    r = r
      .replace(/'/g, "’")
      .replace(/«[ \u00a0]?/g, "«\u202f")
      .replace(/[ \u00a0]?»/g, "\u202f»")
      .replace(/([^\s])[ \u00a0]([;:!?])(?=\s|$)/g, "$1\u202f$2")
      .replace(/(\d)[ \u00a0](?=\d{3}(?!\d))/g, "$1\u202f")
      .replace(/(\d)[ \u00a0]%/g, "$1\u202f%");
  } else {
    r = r.replace(/"([^"\n]+)"/g, "“$1”");
  }
  return r;
}

const EXPLICIT_ID = /\s*\{#([A-Za-z0-9_-]+)\}\s*$/;

/** Anchor for a heading: an explicit `{#id}` suffix wins, otherwise a slug of its text. */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The h2s of a Markdown source, for the margin contents (fenced code is skipped). */
export function extractHeadings(source: string, locale: string): TocItem[] {
  const out: TocItem[] = [];
  let fence: string | null = null;
  for (const line of source.split("\n")) {
    const f = line.match(/^\s*(```|~~~)/);
    if (f) {
      fence = fence === null ? f[1] : fence === f[1] ? null : fence;
      continue;
    }
    if (fence) continue;
    const m = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const explicit = m[1].match(EXPLICIT_ID);
    const raw = m[1]
      .replace(EXPLICIT_ID, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .trim();
    out.push({ id: explicit ? explicit[1] : slugify(raw), text: typeset(raw, locale) });
  }
  return out;
}

/** Splits off what comes before the first h2: the page's lede (a paragraph) or its version line
 *  (a single italic line, as on privacy and legal). */
export function splitIntro(source: string): { intro: string; body: string } {
  const lines = source.split("\n");
  const i = lines.findIndex((l) => /^##\s/.test(l));
  if (i <= 0) return { intro: "", body: source };
  return { intro: lines.slice(0, i).join("\n").trim(), body: lines.slice(i).join("\n") };
}

/* ── remark plugin: heading anchors and the typographic pass ───────────────────────────────── */

type MdNode = {
  type: string;
  value?: string;
  depth?: number;
  lang?: string | null;
  children?: MdNode[];
  data?: { hProperties?: Record<string, unknown> };
};

const SKIP = new Set(["code", "inlineCode", "html", "math", "inlineMath"]);

function plainText(n: MdNode): string {
  if (typeof n.value === "string") return n.value;
  return (n.children ?? []).map(plainText).join("");
}

function remarkReading({ locale }: { locale: string }) {
  let figures = 0;
  const walk = (node: MdNode) => {
    // figures are numbered in reading order: "Fig. 1", "Fig. 2"…
    if (node.type === "code" && node.lang === "prisma") {
      figures += 1;
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, dataFig: figures } };
    }
    if (SKIP.has(node.type)) return;
    if (node.type === "heading" && node.children?.length) {
      const last = node.children[node.children.length - 1];
      let id: string | undefined;
      if (last.type === "text" && typeof last.value === "string") {
        const m = last.value.match(EXPLICIT_ID);
        if (m) {
          id = m[1];
          last.value = last.value.replace(EXPLICIT_ID, "");
        }
      }
      if (node.depth === 2 || node.depth === 3) {
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: id ?? slugify(plainText(node).trim()) } };
      }
    }
    if (node.type === "text" && typeof node.value === "string") node.value = typeset(node.value, locale);
    node.children?.forEach(walk);
  };
  return (tree: MdNode) => {
    figures = 0;
    walk(tree);
  };
}

/* ── PRISMA 2020 flow, drawn as a vertical single-line diagram ──────────────────
   In the Markdown, a fenced block with the language `prisma` holds the figures as `key: number`
   lines; the labels come from the messages (reading.prisma). */

type PrismaData = Record<string, number>;

function parsePrisma(text: string): PrismaData {
  const out: PrismaData = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_.]+)\s*:\s*(\d+)\s*$/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

const REASON_KEYS = ["scope", "private", "custom", "telecom", "duplicate", "etap", "notAfrica", "platform", "global", "sdNoSoftware", "language", "sdOneMarket", "deprecated"] as const;

function PrismaFigure({ d, fig }: { d: PrismaData; fig: number }) {
  const t = useTranslations("reading.prisma");
  const format = useFormatter();
  const n = (k: string) => (d[k] === undefined ? "–" : format.number(d[k]));
  const reasons = REASON_KEYS.filter((k) => d[`reason.${k}`] !== undefined);
  return (
    <figure className="!mt-8">
      <div className="prisma text-[15px] leading-[1.45]" role="group" aria-label={t("aria")}>
        {/* the prose list rules are unlayered, so the list overrides below must be important; the
            exclusions are divs so that `.prose-enermod li > p` leaves their offset alone */}
        <ol className="!list-none !pl-0">
          <li className="x">
            <div>
              <span className="st">{t("identified")}</span>
              <span className="n">
                {n("identified")}
                {d["identified.openalex"] !== undefined && (
                  <small className="ml-2.5 text-[12.5px] font-normal tracking-normal text-muted-foreground">
                    {t("sources", { openalex: n("identified.openalex"), scopus: n("identified.scopus") })}
                  </small>
                )}
              </span>
            </div>
            <div className="ex"><b>{n("duplicates")}</b>{t("duplicates")}</div>
          </li>
          <li className="x !mt-0">
            <div>
              <span className="st">{t("screened")}</span>
              <span className="n">{n("screened")}</span>
            </div>
            <div className="ex"><b>{n("screened.excluded")}</b>{t("screenedExcluded")}</div>
          </li>
          <li className="x !mt-0">
            <div>
              <span className="st">{t("sought")}</span>
              <span className="n">{n("sought")}</span>
            </div>
            <div className="ex"><b>{n("sought.notRetrieved")}</b>{t("notRetrieved")}</div>
          </li>
          <li className="x !mt-0">
            <div>
              <span className="st">{t("assessed")}</span>
              <span className="n">{n("assessed")}</span>
            </div>
            <div className="ex">
              <b>{n("assessed.excluded")}</b>
              {t("assessedExcluded")}
              {reasons.length > 0 && (
                <details className="group mt-1.5">
                  <summary className="link inline-flex min-h-6 cursor-pointer list-none items-center text-[12.5px] [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">{t("showReasons", { n: reasons.length })}</span>
                    <span className="hidden group-open:inline">{t("hideReasons")}</span>
                  </summary>
                  <dl className="mt-1.5 border-t border-rule text-[12.5px] leading-[1.35]">
                    {reasons.map((k) => (
                      <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-border py-[5px]">
                        <dt className="text-ink-2">{t(`reasons.${k}`)}</dt>
                        <dd className="text-right font-semibold tabular-nums text-foreground">{n(`reason.${k}`)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </div>
          </li>
          {/* junction: the studies found by other methods join the feeder before inclusion; the
              branch starts at a source (open circle) instead of ending at a terminal */}
          {d["included.other"] !== undefined && (
            <li className="x !mt-0 before:hidden after:top-[10px] after:w-[calc(50%+34px)] max-md:pb-2">
              <div aria-hidden="true" />
              <div className="ex mt-0 after:left-[13px] after:top-[5px] after:size-[11px] after:rounded-full after:border-[1.5px] after:border-rule after:bg-background max-md:mt-0 max-md:after:top-[2px]">
                <b>{n("included.other")}</b>
                {t("other")}
                {d.other !== undefined && (
                  <span className="mt-0.5 block text-[12px]">
                    {t("otherDetail", { n: n("other"), inventory: n("other.inventory"), citations: n("other.citations"), excluded: n("other.excluded") })}
                  </span>
                )}
              </div>
            </li>
          )}
          <li className="!mt-0">
            <div>
              <span className="st">{t("included")}</span>
              <span className="n">{n("included")}</span>
              {d["included.databases"] !== undefined && (
                <span className="mt-0.5 block text-[12.5px] leading-[1.4] text-muted-foreground tabular-nums">
                  {t("includedDetail", { databases: n("included.databases"), other: n("included.other") })}
                </span>
              )}
            </div>
          </li>
        </ol>
      </div>
      <Caption fig={fig}>{t("caption")}</Caption>
    </figure>
  );
}

/* ── Markdown ──────────────────────────────────────────────────────────────────────────────── */

export function Markdown({ source, locale }: { source: string; locale: string }) {
  const components: Components = {
    a: ({ href, children }) => {
      const h = href ?? "#";
      if (h.startsWith("/")) return <Link href={h}>{children}</Link>;
      const external = /^https?:\/\//.test(h);
      return <a href={h} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
    },
    pre: ({ node, children }) => {
      const code = node?.children[0];
      if (code && code.type === "element" && code.tagName === "code") {
        const cls = code.properties?.className;
        if (Array.isArray(cls) && cls.includes("language-prisma")) {
          const text = code.children.map((c) => (c.type === "text" ? c.value : "")).join("");
          return <PrismaFigure d={parsePrisma(text)} fig={Number(code.properties?.dataFig ?? 1)} />;
        }
      }
      return <pre>{children}</pre>;
    },
    // eslint-disable-next-line @next/next/no-img-element
    img: ({ src, alt }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} loading="lazy" />,
  };
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, [remarkReading, { locale }]]} components={components}>
      {source}
    </ReactMarkdown>
  );
}

/* ── Layout ───────────────────────────────────────────────────────────────────────────────── */

/** Margin contents: small caps "On this page", italic rubric numbers matching the numbered h2s,
 *  13.5px links with 24px targets. Where the browser supports scroll-target groups, the section
 *  in view is marked (ink, 600) without any script. */
function Contents({ items, label }: { items: TocItem[]; label: string }) {
  return (
    <nav aria-label={label} className="border-l border-border pl-4">
      <p className="sc text-muted-foreground">{label}</p>
      <ol className="mt-2.5">
        {items.map((h) => (
          <li key={h.id} className="py-[3px]">
            <a
              href={`#${h.id}`}
              className="inline-block min-h-6 py-[3px] text-[13.5px] leading-[1.35] text-ink-2 no-underline hover:text-link hover:underline hover:underline-offset-3"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Shared reading layout for the Markdown pages. The contents sit in the 176px margin from
 *  1024px. `aside` (the live figures) takes the spare width right of the 680px measure from 1280px
 *  (sticky), and follows the article below that. */
export function ProseLayout({ kicker, title, lede, meta, toc, tocLabel, aside, image, children }: {
  kicker: React.ReactNode;
  numeral?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  meta?: React.ReactNode;
  toc: TocItem[];
  tocLabel: string;
  aside?: React.ReactNode;
  image?: BannerImage;
  children: React.ReactNode;
}) {
  const hasToc = toc.length > 0;
  const rail = hasToc && !!aside;
  return (
    <>
    <PageBanner crumbs={[{ label: kicker }]} title={title} lede={lede} image={image}>
      {meta && <div className="mt-3 text-[14px] leading-[1.45] text-white/70">{meta}</div>}
    </PageBanner>
    <div className="mx-auto w-full max-w-[1248px] px-8 pb-[72px] pt-12 max-md:px-4 max-md:pb-14 max-md:pt-9">
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] gap-x-10",
          hasToc && "lg:grid-cols-[190px_minmax(0,720px)]",
          rail && "xl:grid-cols-[190px_minmax(0,680px)_minmax(270px,1fr)]",
        )}
      >
        {hasToc && (
          <aside className="max-lg:hidden">
            <div className="sticky top-24">
              <Contents items={toc} label={tocLabel} />
            </div>
          </aside>
        )}
        <article className="min-w-0 max-w-[720px]">
          <div className="prose-enermod [&_blockquote_em]:not-italic [&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28">{children}</div>
          {aside && <div className={cn("mt-14 max-w-[380px] rounded-lg border border-border bg-card p-5 shadow-card", rail && "xl:hidden")}>{aside}</div>}
        </article>
        {rail && (
          <aside className="min-w-0 max-xl:hidden">
            <div className="sticky top-28 rounded-lg border border-border bg-card p-5 shadow-card">{aside}</div>
          </aside>
        )}
      </div>
    </div>
    </>
  );
}
