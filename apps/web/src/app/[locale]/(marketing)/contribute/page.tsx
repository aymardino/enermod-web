import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ContributionForm } from "@/components/contribute/contribution-form";
import { Link } from "@/i18n/navigation";
import { KRINEA_URL } from "@/lib/site";
import { PageHead } from "@/components/observatory/page-head";
import { SldStep, SldSteps } from "@/components/marketing/single-line-diagram";

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

/** A ruled note in the side column: 2px ink rule, title. */
function SideBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 border-t-2 border-rule pt-3.5">
      <h2 className="font-display text-[21px] font-semibold leading-[1.25] tracking-[-0.005em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Contribute({ kind, study, tool }: { kind: "study" | "correction" | "tool"; study?: number; tool?: string }) {
  const t = useTranslations("contribute");
  const nav = useTranslations("nav");
  return (
    <div className="mx-auto w-full max-w-[1248px] px-8 pb-[72px] pt-10 max-md:px-4 max-md:pb-14 max-md:pt-8">
      <PageHead
        kicker={nav("contribute")}
        title={t("title")}
        lede={t("lede")}
      />
      <div className="mt-11 grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] max-md:mt-9">
        <div className="min-w-0">
          <ContributionForm initialKind={kind} targetStudyId={study} targetToolName={tool} />
        </div>
        <aside className="min-w-0 space-y-12 lg:max-w-[380px] lg:justify-self-end">
          <SideBlock title={t("how.title")}>
            <SldSteps ariaLabel={t("how.title")}>
              {(["s1", "s2", "s3"] as const).map((s) => (
                <SldStep key={s}>
                  <p className="-mt-0.5 text-[14px] leading-[1.5] text-ink-2">{t(`how.${s}`)}</p>
                </SldStep>
              ))}
            </SldSteps>
          </SideBlock>
          <SideBlock title={t("criteria.title")}>
            <ul className="space-y-2.5 text-[14px] leading-[1.5] text-ink-2">
              {(["c1", "c2", "c3", "c4"] as const).map((k) => (
                <li key={k} className="relative pl-[18px] before:absolute before:left-0 before:top-[0.55em] before:size-[6px] before:bg-rubric">{t(`criteria.${k}`)}</li>
              ))}
            </ul>
            <p className="mt-4 text-[14px]">
              <Link href="/methodology" className="link inline-flex min-h-6 items-center font-medium">{t("criteria.more")}</Link>
            </p>
          </SideBlock>
          <SideBlock title={t("bulk.title")}>
            <p className="text-[14px] leading-[1.5] text-ink-2">
              {t("bulk.text")}{" "}
              <a href={KRINEA_URL} target="_blank" rel="noreferrer" className="link font-medium">Krinea</a>.
            </p>
          </SideBlock>
        </aside>
      </div>
    </div>
  );
}
