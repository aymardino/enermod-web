import { PageBanner } from "@/components/marketing/page-banner";
import type { PhotoId } from "@/data/photos";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@/i18n/navigation";
import { PrismaDiagram, parsePrisma } from "@/components/marketing/prisma-diagram";
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
  const walk = (node: MdNode) => {
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
  return (tree: MdNode) => walk(tree);
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
          return <PrismaDiagram d={parsePrisma(text)} />;
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

/** Shared reading layout for the Markdown pages. The contents sit in the 220px margin from
 *  1024px. `aside` (the live figures) takes the spare width right of the 760px measure from 1280px
 *  (sticky), and follows the article below that. With `figure`, the article is cut in two around a
 *  figure that spans the measure and the rail (the PRISMA diagram); `after` is the second part. */
export function ProseLayout({ kicker, title, lede, meta, toc, tocLabel, aside, photo, figure, after, children }: {
  kicker: React.ReactNode;
  numeral?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  meta?: React.ReactNode;
  toc: TocItem[];
  tocLabel: string;
  aside?: React.ReactNode;
  photo?: PhotoId;
  figure?: React.ReactNode;
  after?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hasToc = toc.length > 0;
  const rail = hasToc && !!aside;
  const split = !!figure;
  const prose = "prose-enermod [&_blockquote_em]:not-italic [&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28";
  const card = aside && <div className={cn("mt-14 max-w-[380px] rounded-lg border border-border bg-card p-5 shadow-card", rail && "xl:hidden")}>{aside}</div>;
  return (
    <>
    <PageBanner crumbs={[{ label: kicker }]} title={title} lede={lede} photo={photo}>
      {meta && <div className="mt-3 text-[14px] leading-[1.45] text-white/70">{meta}</div>}
    </PageBanner>
    <div className="mx-auto w-full max-w-[1800px] px-6 lg:px-12 pb-[72px] pt-12 max-md:px-4 max-md:pb-14 max-md:pt-9">
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] gap-x-12",
          hasToc && (split ? "lg:grid-cols-[220px_minmax(0,760px)_minmax(0,1fr)]" : "lg:grid-cols-[220px_minmax(0,760px)]"),
          rail && "xl:grid-cols-[220px_minmax(0,760px)_320px] xl:justify-between",
        )}
      >
        {hasToc && (
          <aside className={cn("max-lg:hidden", split && "lg:col-start-1 lg:row-span-3 lg:row-start-1")}>
            <div className="sticky top-24">
              <Contents items={toc} label={tocLabel} />
            </div>
          </aside>
        )}
        <article className={cn("min-w-0 max-w-[720px]", split && hasToc && "lg:col-start-2 lg:row-start-1")}>
          <div className={prose}>{children}</div>
          {!split && card}
        </article>
        {rail && (
          <aside className={cn("min-w-0 max-xl:hidden", split && "xl:col-start-3 xl:row-start-1")}>
            <div className="sticky top-28 rounded-lg border border-border bg-card p-5 shadow-card">{aside}</div>
          </aside>
        )}
        {split && (
          <>
            <div className={cn("mt-10 min-w-0", hasToc && "lg:col-span-2 lg:col-start-2 lg:row-start-2")}>{figure}</div>
            <div className={cn("mt-10 min-w-0 max-w-[720px]", hasToc && "lg:col-start-2 lg:row-start-3")}>
              {after && <div className={prose}>{after}</div>}
              {card}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
