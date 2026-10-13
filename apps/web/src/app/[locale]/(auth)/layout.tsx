import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EnermodWordmark } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/marketing/language-switch";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Sign in, sign up and the magic link: a 400px column on paper, the mark (34px, with the
 *  name and no subline) linking home and the language switch above it. No box, no gradient. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  return (
    <main id="main" className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-[432px] px-4 pb-20 pt-16 max-md:pt-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label={t("home")} className="inline-flex min-w-0 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <EnermodWordmark size={34} compact />
          </Link>
          <LanguageSwitch className="-mr-1 text-[12.5px]" />
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
