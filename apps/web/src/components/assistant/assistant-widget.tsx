"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Bot, Send, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type ChatAnswer, type Citation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; citations?: Citation[]; ok?: boolean };
const MAX_TURNS = 15;

/** Strips the [study 12] / [tool X] markers from the text for display; the citations are listed below. */
function clean(text: string) {
  return text.replace(/\s*\[(?:study|tool|country)\s+[^\]]+\]/gi, "");
}

export function AssistantWidget({ context }: { context?: string }) {
  const t = useTranslations("assistant");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const status = useQuery<{ available: boolean; provider: string | null }>({ queryKey: ["chat-status"], queryFn: () => api.get("/chat/status"), staleTime: 300_000 });
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(history);
    setInput("");
    setBusy(true);
    track("chat", q.slice(0, 80));
    try {
      const r = await api.post<ChatAnswer>("/chat", { messages: history.map((m) => ({ role: m.role, content: m.content })), locale, context: context ?? "" });
      setMessages([...history, { role: "assistant", content: r.answer, citations: r.citations, ok: r.ok }]);
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 429 ? t("rateLimited") : e instanceof ApiError && e.status === 503 ? t("unavailable") : t("failed");
      setMessages([...history, { role: "assistant", content: msg, ok: false }]);
    } finally {
      setBusy(false);
    }
  }

  const examples = [t("ex1"), t("ex2"), t("ex3")];
  const limitReached = messages.filter((m) => m.role === "user").length >= MAX_TURNS;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("open")}
        className={cn("fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-medium text-white shadow-pop transition-colors hover:bg-brand-800", open && "hidden")}>
        <Bot className="size-5" />{t("open")}
      </button>
      {open && (
        <section role="dialog" aria-label={t("title")} className="fixed bottom-4 right-4 z-50 flex h-[min(640px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-pop">
          <header className="flex items-start justify-between gap-3 border-b border-border bg-brand-50 px-4 py-3 dark:bg-brand-950">
            <div>
              <p className="flex items-center gap-2 font-display text-base font-semibold"><Bot className="size-4 text-brand-700" />{t("title")} <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">beta</span></p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("caption")}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t("close")}><X className="size-4" /></Button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {status.data && !status.data.available && <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">{t("unavailable")}</p>}
            {messages.length === 0 && status.data?.available && (
              <div className="space-y-2">
                <p className="text-muted-foreground">{t("intro")}</p>
                {examples.map((ex) => <button key={ex} type="button" onClick={() => send(ex)} className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-brand-400">{ex}</button>)}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("rounded-xl px-3 py-2", m.role === "user" ? "ml-8 bg-brand-600 text-white" : "mr-6 bg-muted")}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.role === "assistant" ? clean(m.content) : m.content}</p>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 border-t border-border/60 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("sources")}</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {m.citations.map((c) => <li key={`${c.type}-${c.id}`}><Link href={c.href} className="text-primary hover:underline" onClick={() => setOpen(false)}>{c.type === "study" ? `#${c.id} · ` : ""}{c.label}</Link></li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="mr-6 rounded-xl bg-muted px-3 py-2 text-muted-foreground">{t("thinking")}</p>}
            <div ref={endRef} />
          </div>
          <form className="border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            {limitReached ? <p className="text-xs text-muted-foreground">{t("limit")}</p> : (
              <div className="flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("placeholder")} disabled={busy || status.data?.available === false}
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <Button type="submit" size="icon" className="h-10 w-10" disabled={busy || !input.trim()} aria-label={t("send")}><Send className="size-4" /></Button>
              </div>
            )}
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t("disclaimer")}</p>
          </form>
        </section>
      )}
    </>
  );
}
