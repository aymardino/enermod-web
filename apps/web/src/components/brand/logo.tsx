import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** The EnerMod mark: the African continent in white on a deep-blue rounded square.
 *  40-unit viewBox. With `title` it is an image with that name; without, it is decorative (the
 *  lockup names it). */
export function EnermodMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("block shrink-0", className)} {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: false })}>
      <rect width="40" height="40" rx="9" fill="var(--primary)" />
      <path
        d="M28.3 22.3L28.1 23L28.7 24.6L28.7 26.1L28.2 26.8L26.4 28L26.5 29.6L25.5 30.2L25.2 31.3L23.8 32.7L20.9 33.4L20.5 33.2L20.5 32.3L19.4 30.6L19 28.8L18.1 27.3L18.1 26.4L18.7 24.6L18.1 22.4L16.9 20.9L17.1 19.1L16.8 18.7L15.8 18.9L15.2 18.1L12.9 18.7L10.3 18.6L9.1 17.6L7.8 15.6L7.5 14.6L8.2 13.3L8.2 11.8L9.4 10.2L11.2 8.9L11.5 8L12.8 6.9L14 7.2L15.2 6.8L18.2 6.7L17.9 7.9L20.8 9.2L21.1 8.5L21.6 8.3L24 8.9L25.8 8.8L26.1 9.4L25.9 10L25.2 9.3L25.4 9.7L27 12.1L27.4 13.4L29.6 15.7L29.4 16L30.2 16.4L32.4 15.7L31.7 18.4L28.7 21.5ZM31.9 25.3L32.1 26.5L31.8 26.5L30.5 30L29.9 30.3L29.4 30L29.3 29.2L29.9 27.9L29.8 27.1L30 26.7L30.7 26.5Z"
        fill="#ffffff"
      />
    </svg>
  );
}

/** The lockup: mark, "EnerMod Africa" and the small uppercase subline (EN/FR), hidden below 480px.
 *  - no `size`: responsive masthead lockup (mark 34px, 28px on phones);
 *  - `size` ≥ 32: the large lockup at every width (footer); `size` < 32: the small one (admin bar);
 *  - `compact`: no subline (admin bar). It no longer renders the AISESA logo. */
export function EnermodWordmark({ className, size, compact = false }: { className?: string; size?: number; compact?: boolean }) {
  const t = useTranslations("ui.brand");
  const fr = useLocale() === "fr";
  const mode = size === undefined ? "responsive" : size >= 32 ? "large" : "small";
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3 text-foreground", className)}>
      <EnermodMark className={cn(mode === "responsive" && "size-7 md:size-[34px]", mode === "large" && "size-[34px]", mode === "small" && "size-7")} />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "whitespace-nowrap font-bold tracking-[-0.01em]",
            mode === "responsive" && "text-[20px] md:text-[24px]",
            mode === "large" && "text-[24px]",
            mode === "small" && "text-[20px]",
          )}
        >
          EnerMod <span className="font-semibold text-brand-700">Africa</span>
        </span>
        {!compact && (
          <span
            className={cn(
              "mt-[5px] whitespace-nowrap font-sans font-semibold uppercase text-muted-foreground max-[480px]:hidden",
              mode === "responsive" && !fr && "text-[9px] tracking-[0.12em] md:text-[10.5px] md:tracking-[0.14em]",
              mode === "responsive" && fr && "text-[8.5px] tracking-[0.06em] md:text-[10px] md:tracking-[0.1em]",
              mode === "large" && !fr && "text-[10.5px] tracking-[0.14em]",
              mode === "large" && fr && "text-[10px] tracking-[0.1em]",
              mode === "small" && !fr && "text-[9px] tracking-[0.12em]",
              mode === "small" && fr && "text-[8.5px] tracking-[0.06em]",
            )}
          >
            {t("subline")}
          </span>
        )}
      </span>
    </span>
  );
}

const AISESA = { src: "/brand/aisesa_logo.png", w: 600, h: 254 };
const MINES = { src: "/brand/mines_psl_tti5.png", w: 800, h: 170 };

/** AISESA logo in its true colours, multiplied onto paper or sand. 20px in the utility strip. */
export function AisesaLogo({ height = 20, className, alt = "AISESA", priority = false }: { height?: number; className?: string; alt?: string; priority?: boolean }) {
  const width = Math.round((height * AISESA.w) / AISESA.h);
  return (
    <Image src={AISESA.src} alt={alt} width={width} height={height} priority={priority}
      className={cn("shrink-0 mix-blend-multiply", className)} style={{ height, width }} />
  );
}

/** AISESA and MINES Paris-PSL / TTI 1.5: 44px in the footer, 52px in the home colophon and About. */
export function PartnerLogos({ className, height = 44 }: { className?: string; height?: number }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-[22px] gap-y-4", className)}>
      <AisesaLogo height={height} alt="AISESA, African Institute for Sustainable Energy and Systems Analysis" />
      <Image src={MINES.src} alt="MINES Paris-PSL · The Transition Institute 1.5" width={Math.round((height * MINES.w) / MINES.h)} height={height}
        className="shrink-0 mix-blend-multiply" style={{ height, width: Math.round((height * MINES.w) / MINES.h) }} />
    </div>
  );
}
