"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, Link } from "@/i18n/navigation";
import { api } from "@/lib/api";

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
    const done = async () => { await qc.invalidateQueries({ queryKey: ["me"] }); router.replace("/contribute"); };
    if (!token) return;
    api.post("/auth/magic-link/verify", { token }).then(done).catch(async () => {
      try { await api.get("/auth/me"); await done(); } catch { setFailed(true); }
    });
  }, [params, router, qc]);
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">{failed ? t("magicInvalid") : t("magicChecking")}</p>
      {failed && <Link href="/sign-in" className="mt-4 inline-block text-primary underline">{t("noAccount")}</Link>}
    </div>
  );
}
