"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/auth";
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

/** A sentence in a note block: ochre rule for a problem, green rule for a confirmation. */
function Note({ tone = "ok", children }: { tone?: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <div role="status" className={`border-l-2 py-0.5 pl-3.5 font-display text-[15px] leading-[1.45] text-ink-2 ${tone === "warn" ? "border-amber-500" : "border-rubric"}`}>
      {children}
    </div>
  );
}

/** Which ways of signing in this server offers (e-mail links need a mail provider, Google a client id). */
function useProviders() {
  return useQuery<{ email: boolean; password: boolean; google: boolean }>({
    queryKey: ["auth-providers"],
    queryFn: () => api.get("/auth/providers"),
    staleTime: 600_000,
  });
}

/** Google's "G" in its four colours, 18px. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-[18px] shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** The Google button: a plain link to the API, which sends the browser to Google and back. */
function GoogleButton({ next }: { next: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const href = api.url(`/auth/google/start?next=${encodeURIComponent(next)}&locale=${locale}`);
  return (
    <Button variant="outline" size="lg" className="w-full" asChild>
      <a href={href}>
        <GoogleMark />
        {t("google")}
      </a>
    </Button>
  );
}

export function AuthForm({ mode, next = "/contribute", error }: { mode: "sign-in" | "sign-up"; next?: string; error?: string }) {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const providers = useProviders();
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

  const google = providers.data?.google === true;
  const emailLinks = providers.data?.email === true;

  return (
    <div>
      <AuthHead title={mode === "sign-in" ? t("signInTitle") : t("signUpTitle")}>{t("why")}</AuthHead>
      {error === "google" && <div className="mt-6"><Note tone="warn">{t("googleError")}</Note></div>}

      {google && (
        <div className="mt-6">
          <GoogleButton next={next} />
          <p aria-hidden="true" className="mt-5 flex items-center gap-3 text-[12.5px] uppercase tracking-[0.08em] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            {t("or")}
          </p>
        </div>
      )}

      <form onSubmit={submit} className={google ? "mt-5 space-y-5" : "mt-6 space-y-5"}>
        {mode === "sign-up" && (
          <>
            <div><Label htmlFor="name">{t("name")}</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div><Label htmlFor="org">{t("organisation")}</Label><Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="organization" /></div>
          </>
        )}
        <div><Label htmlFor="email">{t("email")}</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="password">{t("password")}</Label>
            {mode === "sign-in" && (
              <Link href="/forgot-password" className="link mb-[9px] inline-flex min-h-6 items-center text-[13px]">{t("forgot")}</Link>
            )}
          </div>
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

      {emailLinks && (
        <section aria-labelledby="magic-title" className="mt-8 border-t border-border pt-5">
          <h2 id="magic-title" className="field-label">{t("magicTitle")}</h2>
          {magicSent === null ? (
            <Button type="button" variant="outline" className="mt-3 w-full" disabled={busy || !email} onClick={magic}>{t("magicButton")}</Button>
          ) : (
            <div className="mt-3">
              <Note>
                <p>
                  {t("magicSent")}
                  {magicSent && <> <a className="link not-italic" href={magicSent}>(dev link)</a></>}
                </p>
                <button type="button" className="link mt-1.5 inline-flex min-h-6 items-center font-sans text-[13.5px] not-italic" onClick={() => setMagicSent(null)}>{t("magicAgain")}</button>
              </Note>
            </div>
          )}
        </section>
      )}

      <p className="mt-8 border-t border-border pt-5 text-[14px] text-muted-foreground">
        {mode === "sign-in" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"} className="link inline-flex min-h-6 items-center font-medium">{mode === "sign-in" ? c("signUp") : c("signIn")}</Link>
      </p>
    </div>
  );
}

/** "Forgot your password?": asks for the address; the API mails a one-time link that signs
 *  the person in and lands on the new-password page. The answer never says whether an
 *  account exists. */
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post<{ ok: boolean; dev_link?: string }>("/auth/password/forgot", { email, locale });
      setSent(r.dev_link ?? "");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : c("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AuthHead title={t("forgotTitle")}>{t("forgotText")}</AuthHead>
      {sent === null ? (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div><Label htmlFor="email">{t("email")}</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{t("forgotButton")}</Button>
        </form>
      ) : (
        <div className="mt-6">
          <Note>
            <p>
              {t("forgotSent")}
              {sent && <> <a className="link not-italic" href={sent}>(dev link)</a></>}
            </p>
            <button type="button" className="link mt-1.5 inline-flex min-h-6 items-center font-sans text-[13.5px] not-italic" onClick={() => setSent(null)}>{t("forgotAgain")}</button>
          </Note>
        </div>
      )}
      <p className="mt-8 border-t border-border pt-5 text-[14px] text-muted-foreground">
        <Link href="/sign-in" className="link inline-flex min-h-6 items-center font-medium">{c("signIn")}</Link>
      </p>
    </div>
  );
}

/** Set a new password for the signed-in account (PATCH /auth/me). Visitors are sent to sign in
 *  and come back here. */
export function NewPasswordForm() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const router = useRouter();
  const { data: me, isLoading } = useMe();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    if (!isLoading && me === null && !redirected.current) {
      redirected.current = true;
      router.replace("/sign-in?next=/account/password");
    }
  }, [isLoading, me, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      await api.patch("/auth/me", { password });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : c("error"));
    } finally {
      setBusy(false);
    }
  }

  const mismatch = confirm.length > 0 && password !== confirm;
  return (
    <div>
      <AuthHead title={t("newPasswordTitle")}>{me ? t("newPasswordText", { email: me.email }) : t("signInFirst")}</AuthHead>
      {me && !done && (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <Label htmlFor="new-password">{t("newPassword")}</Label>
            <Input id="new-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-describedby="new-password-hint" />
            <FieldHint id="new-password-hint">{t("passwordHint")}</FieldHint>
          </div>
          <div>
            <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
            <Input id="confirm-password" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={mismatch || undefined} aria-describedby={mismatch ? "confirm-hint" : undefined} />
            {mismatch && <FieldHint id="confirm-hint" error>{t("passwordMismatch")}</FieldHint>}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy || mismatch}>{c("save")}</Button>
        </form>
      )}
      {done && (
        <div className="mt-6">
          <Note><p>{t("passwordSaved")}</p></Note>
          <p className="mt-5 text-[14px]">
            <Link href={me && (me.role === "curator" || me.role === "admin") ? "/admin" : "/contribute"} className="link inline-flex min-h-6 items-center font-medium">
              {me && (me.role === "curator" || me.role === "admin") ? t("toAdmin") : c("account")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
