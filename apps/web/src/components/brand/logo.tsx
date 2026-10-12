import Image from "next/image";
import { cn } from "@/lib/utils";

/** The AISESA green mark next to the EnerMod Africa wordmark. One image for both themes. */
export function EnermodWordmark({ className, size = 36, compact = false }: { className?: string; size?: number; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src="/brand/aisesa_logo.png" alt="AISESA" width={size * 2} height={size} className="h-auto shrink-0" style={{ height: size, width: "auto" }} priority />
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[1.05rem] font-semibold tracking-tight text-foreground">EnerMod Africa</span>
          <span className="hidden text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground sm:block">Energy Modelling Observatory</span>
        </span>
      )}
    </span>
  );
}

export function PartnerLogos({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-6", className)}>
      <Image src="/brand/aisesa_logo.png" alt="AISESA" width={160} height={80} className="h-12 w-auto" />
      <Image src="/brand/mines_psl_tti5.png" alt="MINES Paris-PSL · The Transition Institute 1.5" width={240} height={80} className="h-12 w-auto" />
    </div>
  );
}
