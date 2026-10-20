"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, Link } from "@/i18n/navigation";
import { api, type User } from "@/lib/api";
import { safeNext } from "@/lib/utils";
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
  // a password-reset link lands on the account page; it must only ever act for the account
  // the link was mailed to, so an invalid one is never rescued by a session already open
  const reset = (params.get("next") ?? "").startsWith("/account/password");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get("token");
    const target = safeNext(params.get("next"));
    const done = (user: User) => { qc.setQueryData(["me"], user); router.replace(target); };
    if (!token) return;
    api.post<User>("/auth/magic-link/verify", { token }).then(done).catch(async () => {
      if (reset) { setFailed(true); return; }
      // a sign-in link opened twice: the first click already signed this browser in
      try { done(await api.get<User>("/auth/me")); } catch { setFailed(true); }
    });
  }, [params, router, qc, reset]);
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
          <Link href={reset ? "/forgot-password" : "/sign-in"} className="link inline-flex min-h-6 items-center font-medium">{t(reset ? "forgotLinkAgain" : "backToSignIn")}</Link>
        </p>
      )}
    </div>
  );
}
