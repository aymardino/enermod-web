import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CONTACT_EMAIL, REPO_URL } from "@/lib/site";
import { Link } from "@/i18n/navigation";
import { PageHead } from "@/components/observatory/page-head";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("contact.title"), description: t("contact.description") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Contact />;
}

const actionClass = "link inline-flex min-h-6 items-center gap-1.5 text-[14.5px] font-medium [&_svg]:size-4 [&_svg]:shrink-0";

function Contact() {
  const t = useTranslations("contact");
  const nav = useTranslations("nav");
  const channels = ["institutions", "community", "code"] as const;
  return (
    <div className="mx-auto w-full max-w-[1248px] px-8 pb-[72px] pt-10 max-md:px-4 max-md:pb-14 max-md:pt-8">
      <PageHead kicker={nav("footer.project")} title={t("title")} lede={t("lede")} />
      <div className="mt-11 grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] max-md:mt-9">
        {/* the channels: a ruled list, small-caps labels in the margin, no icon tiles */}
        <ul className="min-w-0 border-t-2 border-rule">
          {channels.map((k) => (
            <li key={k} className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-2 border-b border-border py-5 md:grid-cols-[200px_minmax(0,1fr)]">
              <h2 className="sc pt-[5px] text-foreground">{t(`${k}.title`)}</h2>
              <div className="min-w-0">
                <p className="max-w-[38em] font-display text-[17.5px] leading-[1.5] text-ink-2">{t(`${k}.text`)}</p>
                {k === "community" && (
                  <p className="mt-3"><Link href="/contribute" className={actionClass}>{t("community.cta")}<ArrowRight aria-hidden="true" strokeWidth={1.5} /></Link></p>
                )}
                {k === "code" && (
                  <p className="mt-3"><a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" className={actionClass}>{t("code.cta")}<ArrowUpRight aria-hidden="true" strokeWidth={1.5} /></a></p>
                )}
                {k === "institutions" && CONTACT_EMAIL && (
                  <p className="mt-3"><a href={`mailto:${CONTACT_EMAIL}`} className={actionClass}>{CONTACT_EMAIL}</a></p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <aside className="min-w-0 border-t-2 border-rule pt-3.5" aria-labelledby="contact-email">
          <h2 id="contact-email" className="sc text-foreground">{t("byEmail")}</h2>
          {CONTACT_EMAIL ? (
            <p className="mt-4 font-display text-[17.5px] leading-[1.5] text-ink-2">
              {t("email")}{" "}
              <a className="link font-medium text-foreground" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          ) : (
            <p className="mt-4 font-display text-[17.5px] leading-[1.5] text-ink-2">{t("emailSoon")}</p>
          )}
          <p className="mt-4 border-l-2 border-rubric py-0.5 pl-3.5 font-display text-[15px] leading-[1.45] text-ink-2">{t("response")}</p>
        </aside>
      </div>
    </div>
  );
}
