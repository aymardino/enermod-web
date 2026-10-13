"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldHint, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Heading of the auth column: h1 32px, the reason in serif, closed by a 2px rule. */
export function AuthHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="border-b-2 border-rule pb-5">
      <h1 className="text-balance font-display text-[32px] font-bold leading-[1.1] tracking-[-0.018em]">{title}</h1>
      {children && <div className="mt-2.5 font-display text-[16.5px] leading-[1.5] text-ink-2">{children}</div>}
    </header>
  );
}

export function AuthForm({ mode, next = "/contribute" }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "sign-up") await api.post("/auth/register", { email, password, name, organisation: org, locale });
      else await api.post("/auth/login", { email, password });
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.push(next);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : c("error"));
    } finally {
      setBusy(false);
    }
  }

  async function magic() {
    if (!email) return;
    setBusy(true);
    try {
      const r = await api.post<{ ok: boolean; dev_link?: string }>("/auth/magic-link", { email, locale });
      setMagicSent(r.dev_link ?? "");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : c("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AuthHead title={mode === "sign-in" ? t("signInTitle") : t("signUpTitle")}>{t("why")}</AuthHead>
      <form onSubmit={submit} className="mt-6 space-y-5">
        {mode === "sign-up" && (
          <>
            <div><Label htmlFor="name">{t("name")}</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div><Label htmlFor="org">{t("organisation")}</Label><Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="organization" /></div>
          </>
        )}
        <div><Label htmlFor="email">{t("email")}</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div>
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            aria-describedby={mode === "sign-up" ? "password-hint" : undefined}
          />
          {mode === "sign-up" && <FieldHint id="password-hint">{t("passwordHint")}</FieldHint>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{mode === "sign-in" ? c("signIn") : c("signUp")}</Button>
      </form>

      <section aria-labelledby="magic-title" className="mt-8 border-t border-border pt-5">
        <h2 id="magic-title" className="field-label">{t("magicTitle")}</h2>
        {magicSent === null ? (
          <Button type="button" variant="outline" className="mt-3 w-full" disabled={busy || !email} onClick={magic}>{t("magicButton")}</Button>
        ) : (
          <div role="status" className="mt-3 border-l-2 border-rubric py-0.5 pl-3.5 font-display text-[15px] leading-[1.45] text-ink-2">
            <p>
              {t("magicSent")}
              {magicSent && <> <a className="link not-italic" href={magicSent}>(dev link)</a></>}
            </p>
            <button type="button" className="link mt-1.5 inline-flex min-h-6 items-center font-sans text-[13.5px] not-italic" onClick={() => setMagicSent(null)}>{t("magicAgain")}</button>
          </div>
        )}
      </section>

      <p className="mt-8 border-t border-border pt-5 text-[14px] text-muted-foreground">
        {mode === "sign-in" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"} className="link inline-flex min-h-6 items-center font-medium">{mode === "sign-in" ? c("signUp") : c("signIn")}</Link>
      </p>
    </div>
  );
}
