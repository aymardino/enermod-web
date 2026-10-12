import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ContributionForm } from "@/components/contribute/contribution-form";
import { Link } from "@/i18n/navigation";
import { KRINEA_URL } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("contribute.title"), description: t("contribute.description") };
}

export default async function ContributePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ kind?: string; study?: string; tool?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const kind = sp.kind === "correction" || sp.kind === "tool" ? sp.kind : "study";
  return <Contribute kind={kind} study={sp.study ? Number(sp.study) : undefined} tool={sp.tool} />;
}

function Contribute({ kind, study, tool }: { kind: "study" | "correction" | "tool"; study?: number; tool?: string }) {
  const t = useTranslations("contribute");
  return (
    <section className="mx-auto max-w-6xl 2xl:max-w-[1400px] px-4 py-12 sm:px-6 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("lede")}</p>
          <div className="mt-8"><ContributionForm initialKind={kind} targetStudyId={study} targetToolName={tool} /></div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold">{t("how.title")}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>{t("how.s1")}</li><li>{t("how.s2")}</li><li>{t("how.s3")}</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold">{t("criteria.title")}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>{t("criteria.c1")}</li><li>{t("criteria.c2")}</li><li>{t("criteria.c3")}</li><li>{t("criteria.c4")}</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground"><Link href="/methodology" className="text-primary underline">{t("criteria.more")}</Link></p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold">{t("bulk.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("bulk.text")} <a href={KRINEA_URL} target="_blank" rel="noreferrer" className="text-primary underline">Krinea</a>.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
