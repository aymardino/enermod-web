import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Building2, GitPullRequest, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL, REPO_URL } from "@/lib/site";
import { Link } from "@/i18n/navigation";

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

function Contact() {
  const t = useTranslations("contact");
  const cards = [
    { key: "institutions", icon: <Building2 /> },
    { key: "community", icon: <Users /> },
    { key: "code", icon: <GitPullRequest /> },
  ] as const;
  return (
    <section className="mx-auto max-w-5xl 2xl:max-w-6xl px-4 py-14 sm:px-6 md:py-20">
      <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("lede")}</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.key} className="rounded-xl border border-border bg-card p-6 shadow-card">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100 [&_svg]:size-5">{c.icon}</span>
            <h2 className="mt-4 text-lg font-semibold">{t(`${c.key}.title`)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`${c.key}.text`)}</p>
            {c.key === "community" && <Button variant="outline" size="sm" className="mt-4" asChild><Link href="/contribute">{t("community.cta")}</Link></Button>}
            {c.key === "code" && <Button variant="outline" size="sm" className="mt-4" asChild><a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">{t("code.cta")}</a></Button>}
          </div>
        ))}
      </div>
      <div className="mt-10 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-5 text-sm">
        <Mail className="mt-0.5 size-4 shrink-0 text-brand-700" />
        <div>
          {CONTACT_EMAIL ? <p>{t("email")} <a className="font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p> : <p className="text-muted-foreground">{t("emailSoon")}</p>}
          <p className="mt-1 text-muted-foreground">{t("response")}</p>
        </div>
      </div>
    </section>
  );
}
