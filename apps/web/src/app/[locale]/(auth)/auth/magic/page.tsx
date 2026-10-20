"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { AuthHead } from "@/components/admin/auth-forms";

export default function MagicPage() {
  return <Suspense fallback={null}><Magic /></Suspense>;
}

function Magic() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [failed, setFailed] = useState(() => !params.get("token"));
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get("token");
    // only a path inside the site, never another host
    const next = params.get("next") ?? "";
    const target = /^\/(?!\/)[^\s\\]*$/.test(next) && !next.startsWith("/api") ? next : "/contribute";
    const done = async () => { await qc.invalidateQueries({ queryKey: ["me"] }); router.replace(target); };
    if (!token) return;
    api.post("/auth/magic-link/verify", { token }).then(done).catch(async () => {
      try { await api.get("/auth/me"); await done(); } catch { setFailed(true); }
    });
  }, [params, router, qc]);
  return (
    <div>
      <AuthHead title={t("signInTitle")} />
      <div role="status" className="mt-6">
        {failed ? (
          <div className="border-l-2 border-amber-500 py-0.5 pl-3.5 font-display text-[15px] leading-[1.45] text-ink-2">
            <p>{t("magicInvalid")}</p>
          </div>
        ) : (
          <p className="font-display text-[16.5px] leading-[1.5] text-muted-foreground">{t("magicChecking")}</p>
        )}
      </div>
      {failed && (
        <p className="mt-5 text-[14px]">
          <Link href="/sign-in" className="link inline-flex min-h-6 items-center font-medium">{t("backToSignIn")}</Link>
        </p>
      )}
    </div>
  );
}
