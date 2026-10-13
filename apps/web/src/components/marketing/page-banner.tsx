import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { PHOTOS, photoAlt, photoCredit, type PhotoId } from "@/data/photos";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** The African continent (same outline as the mark), used large and faint in banners. */
const AFRICA = "M28.3 22.3L28.1 23L28.7 24.6L28.7 26.1L28.2 26.8L26.4 28L26.5 29.6L25.5 30.2L25.2 31.3L23.8 32.7L20.9 33.4L20.5 33.2L20.5 32.3L19.4 30.6L19 28.8L18.1 27.3L18.1 26.4L18.7 24.6L18.1 22.4L16.9 20.9L17.1 19.1L16.8 18.7L15.8 18.9L15.2 18.1L12.9 18.7L10.3 18.6L9.1 17.6L7.8 15.6L7.5 14.6L8.2 13.3L8.2 11.8L9.4 10.2L11.2 8.9L11.5 8L12.8 6.9L14 7.2L15.2 6.8L18.2 6.7L17.9 7.9L20.8 9.2L21.1 8.5L21.6 8.3L24 8.9L25.8 8.8L26.1 9.4L25.9 10L25.2 9.3L25.4 9.7L27 12.1L27.4 13.4L29.6 15.7L29.4 16L30.2 16.4L32.4 15.7L31.7 18.4L28.7 21.5ZM31.9 25.3L32.1 26.5L31.8 26.5L30.5 30L29.9 30.3L29.4 30L29.3 29.2L29.9 27.9L29.8 27.1L30 26.7L30.7 26.5Z";

export type Crumb = { label: React.ReactNode; href?: string };

/** A banner photo: `src` under /public, `credit` printed small in the corner, `position` = CSS
 *  object-position (which part of the photo stays visible when cropped). */
export type BannerImage = { src: string; alt?: string; credit?: string; creditHref?: string; position?: string };

/** Full-width page banner, institutional style: deep green band, breadcrumb, eyebrow, white title,
 *  lede, optional extra content; the continent in watermark on the right. `bleed` stretches it to the
 *  viewport edges when it sits inside a centred page container. `wide` matches the 1400px container. */
export function PageBanner({ crumbs, eyebrow, title, lede, children, image: imageProp, photo, bleed = false, wide = false, className }: {
  crumbs?: Crumb[];
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children?: React.ReactNode;
  image?: BannerImage;
  /** a photo of the registry (src/data/photos.ts), credited automatically */
  photo?: PhotoId;
  bleed?: boolean;
  wide?: boolean;
  className?: string;
}) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const image: BannerImage | undefined = photo
    ? { src: PHOTOS[photo].src, alt: photoAlt(photo, locale), credit: photoCredit(photo, locale), creditHref: "source" in PHOTOS[photo] ? (PHOTOS[photo] as { source?: string }).source : undefined, position: PHOTOS[photo].position }
    : imageProp;
  return (
    <header className={cn("relative isolate overflow-hidden bg-brand-900 text-white", bleed && "page-banner", className)}>
      {image ? (
        <>
          <Image src={image.src} alt={image.alt ?? ""} fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: image.position ?? "center" }} />
          {/* readable text: deep green on the left fading to a light tint on the right */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(10_39_22/0.94)_0%,rgb(18_63_37/0.82)_45%,rgb(18_63_37/0.35)_100%)] max-md:bg-[rgb(10_39_22/0.82)]" />
          {image.credit &&
            (image.creditHref ? (
              <a href={image.creditHref} target="_blank" rel="noreferrer" title={image.alt} className="absolute bottom-2 right-3 z-10 text-[11.5px] text-white/70 no-underline hover:text-white hover:underline">{image.credit}</a>
            ) : (
              <p className="absolute bottom-2 right-3 z-10 text-[11.5px] text-white/70">{image.credit}</p>
            ))}
        </>
      ) : (
        <>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(120%_140%_at_85%_0%,var(--brand-700)_0%,transparent_60%)]" />
          <svg aria-hidden="true" viewBox="6 6 28 28" className="pointer-events-none absolute -right-10 top-1/2 -z-10 h-[150%] -translate-y-1/2 opacity-[0.09] max-md:hidden">
            <path d={AFRICA} fill="#ffffff" />
          </svg>
        </>
      )}
      <div className={cn("mx-auto w-full max-w-[1800px] px-6 lg:px-12 py-12 max-md:px-4 max-md:py-9", image && "py-16 md:py-20", wide && "2xl:max-w-[1800px]")}>
        {crumbs && crumbs.length > 0 && (
          <nav aria-label={t("breadcrumb")} className="mb-5">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] text-white/75">
              <li><Link href="/" className="text-white/85 underline-offset-3 hover:text-white hover:underline">{t("crumbHome")}</Link></li>
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <ChevronRight aria-hidden="true" className="size-3.5 text-white/50" />
                  {c.href ? (
                    <Link href={c.href} className="text-white/85 underline-offset-3 hover:text-white hover:underline">{c.label}</Link>
                  ) : (
                    <span aria-current="page" className="text-white">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-brand-200">{eyebrow}</p>}
        <h1 className="max-w-[24em] text-balance text-[32px] font-bold leading-[1.12] md:text-[44px]">{title}</h1>
        <span aria-hidden="true" className="mt-5 block h-1 w-14 rounded-full bg-brand-300" />
        {lede && <div className="mt-5 max-w-[48em] text-[17px] leading-[1.6] text-white/85 md:text-[18.5px] [&_a]:text-white [&_a]:underline">{lede}</div>}
        {children}
      </div>
    </header>
  );
}
