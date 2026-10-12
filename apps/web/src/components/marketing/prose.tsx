import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@/i18n/navigation";

/** Shared reading layout for the Markdown pages (about, methodology, research, privacy, legal). */
export function ProseLayout({ title, description, children, aside }: { title: string; description?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-12 sm:px-6 md:py-16">
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
        {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
      </div>
      <div className={aside ? "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]" : "mt-10"}>
        <div className="prose-enermod max-w-3xl">{children}</div>
        {aside && <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">{aside}</aside>}
      </div>
    </article>
  );
}

export function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          const h = href ?? "#";
          if (h.startsWith("/")) return <Link href={h}>{children}</Link>;
          const external = /^https?:\/\//.test(h);
          return <a href={h} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
        },
        // eslint-disable-next-line @next/next/no-img-element
        img: ({ src, alt }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} loading="lazy" />,
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
