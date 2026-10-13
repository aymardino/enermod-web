"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageSquare, Send, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError, type ChatAnswer, type Citation } from "@/lib/api";
import { BetaTag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/observatory/kpi";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; citations?: Citation[]; ok?: boolean };
const MAX_TURNS = 15;

/** The model writes [study 12], [tool X] or [country KE] after a claim (the API resolves them into `citations`). */
const CITE_RE = /\s*\[(study|tool|country)\s+([^\]]+)\]/gi;

/** An answer's text with each marker replaced by the number of its source (1-based, in the order of
 *  `citations`) as a rubric superscript link to the source list; markers with no record are dropped. */
function AnswerText({ text, citations, anchor, label }: { text: string; citations: Citation[]; anchor: string; label: (n: number) => string }) {
  const parts: React.ReactNode[] = [];
  const re = new RegExp(CITE_RE.source, "gi");
  let last = 0;
  let prevSup = false;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const before = text.slice(last, m.index);
    if (before) { parts.push(before); prevSup = false; }
    const kind = m[1].toLowerCase();
    const ref = m[2].trim().toLowerCase();
    const i = citations.findIndex((c) => c.type === kind && c.id.toLowerCase() === ref);
    if (i >= 0) {
      parts.push(
        <sup key={m.index} className="font-sans text-[11px] font-semibold not-italic">
          {prevSup && <span aria-hidden="true" className="text-muted-foreground">,</span>}
          <a href={`#${anchor}-${i + 1}`} aria-label={label(i + 1)} className="px-px text-rubric no-underline hover:underline">{i + 1}</a>
        </sup>,
      );
      prevSup = true;
    }
    last = re.lastIndex;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/** "Ask the observatory": an ink trigger fixed bottom-right (icon only under 400px), and a
 *  plate panel (380×560; a full-screen sheet on phones) with the small-caps title, the Beta tag and
 *  the close X; questions right-aligned on tint, answers in with rubric citation numbers
 *  pointing to a ruled source list; a textarea composer with an ink send button; the disclaimer. */
export function AssistantWidget({ context }: { context?: string }) {
  const t = useTranslations("assistant");
  const ui = useTranslations("ui");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const status = useQuery<{ available: boolean; provider: string | null }>({ queryKey: ["chat-status"], queryFn: () => api.get("/chat/status"), staleTime: 300_000 });
  const endRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `assistant-title-${uid}`;
  const captionId = `assistant-caption-${uid}`;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, open]);
  // Opening moves focus into the panel: the composer, or the close button when it cannot be used.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const field = inputRef.current;
      (field && !field.disabled ? field : closeRef.current)?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Escape closes the panel wherever focus is (it can fall to the body when an example is sent).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  // The composer is disabled while an answer is on its way; give it focus back when it returns.
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy && open) inputRef.current?.focus();
    wasBusy.current = busy;
  }, [busy, open]);

  /** Close from the X and give focus back to the trigger. */
  function dismiss() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

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
  const unavailable = status.data?.available === false;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "fixed bottom-5 right-5 z-40 inline-flex h-[42px] items-center gap-2.5 rounded-sm bg-primary pl-3 pr-4 text-sm font-medium text-primary-foreground shadow-pop hover:bg-brand-800 max-[400px]:w-[42px] max-[400px]:justify-center max-[400px]:px-0",
          open && "hidden",
        )}
      >
        <MessageSquare className="size-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span className="max-[400px]:sr-only">{t("open")}</span>
      </button>
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={captionId}
          className="plate fixed z-50 flex flex-col p-0 shadow-pop max-md:inset-0 max-md:h-[100dvh] max-md:w-full max-md:border-0 md:bottom-5 md:right-5 md:h-[min(560px,calc(100dvh-2.5rem))] md:w-[380px]"
        >
          <header className="flex-none border-b border-rule px-[18px] pb-3 pt-[17px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                <h2 id={titleId} className="sc text-foreground">{t("title")}</h2>
                <BetaTag>{ui("beta.tag")}</BetaTag>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={dismiss}
                className="-mr-1.5 inline-flex size-8 flex-none items-center justify-center rounded-sm text-foreground hover:bg-muted"
              >
                <X className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                <span className="sr-only">{t("close")}</span>
              </button>
            </div>
            <p id={captionId} className="mt-1 font-display text-[14px] leading-[1.4] text-muted-foreground">{t("caption")}</p>
          </header>

          <div role="log" aria-live="polite" className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-[18px] py-4">
            {unavailable && <Callout tone="amber">{t("unavailable")}</Callout>}
            {messages.length === 0 && status.data?.available && (
              <div>
                <p className="font-display text-[16px] leading-[1.5] text-ink-2">{t("intro")}</p>
                <p className="sc mt-4 text-muted-foreground">{t("examples")}</p>
                <ul className="mt-1.5 border-t border-rule">
                  {examples.map((ex) => (
                    <li key={ex} className="border-b border-border">
                      <button
                        type="button"
                        onClick={() => send(ex)}
                        className="group grid w-full grid-cols-[minmax(0,1fr)_16px] items-center gap-x-3 py-2.5 text-left text-[14px] leading-[1.45] text-foreground hover:bg-sand-100"
                      >
                        <span>{ex}</span>
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground" strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end pl-10">
                  <p className="whitespace-pre-wrap rounded-sm bg-muted px-3 py-2 text-[14px] leading-[1.5] text-foreground">
                    <span className="sr-only">{t("you")}: </span>
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={i} className="pr-2">
                  <p className={cn("whitespace-pre-wrap font-display text-[16px] leading-[1.55]", m.ok === false ? "text-muted-foreground" : "text-foreground")}>
                    <span className="sr-only">{t("answer")}: </span>
                    <AnswerText text={m.content} citations={m.citations ?? []} anchor={`${uid}-${i}`} label={(n) => t("cite", { n })} />
                  </p>
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 border-t border-rule pt-2">
                      <p className="sc text-muted-foreground">{t("sources")}</p>
                      <ol className="mt-1">
                        {m.citations.map((c, n) => (
                          <li
                            key={`${c.type}-${c.id}`}
                            id={`${uid}-${i}-${n + 1}`}
                            className="grid scroll-mt-2 grid-cols-[22px_minmax(0,1fr)] items-baseline border-b border-border py-1.5 text-[13px] leading-[1.45] last:border-b-0"
                          >
                            <span className="font-semibold tabular-nums text-rubric">{n + 1}</span>
                            <Link href={c.href} className="link min-w-0" onClick={() => setOpen(false)}>
                              {c.type === "study" && (
                                <Fragment>
                                  <span aria-hidden="true">{ui("study.no")}</span> <span className="tabular-nums">{c.id}</span> ·{" "}
                                </Fragment>
                              )}
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ),
            )}
            {busy && <p className="font-display text-[15px] text-muted-foreground">{t("thinking")}</p>}
            <div ref={endRef} />
          </div>

          <form className="flex-none border-t border-rule px-[18px] pb-3.5 pt-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            {limitReached ? (
              <p className="font-display text-[14px] text-muted-foreground">{t("limit")}</p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
                  }}
                  placeholder={t("placeholder")}
                  aria-label={t("placeholder")}
                  disabled={busy || unavailable}
                  className="block min-h-[38px] w-full min-w-0 flex-1 resize-none rounded-sm border border-input bg-card px-3 py-2 text-[14.5px] leading-[1.45] text-foreground placeholder:text-muted-foreground focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label={t("send")}>
                  <Send strokeWidth={1.75} aria-hidden="true" />
                </Button>
              </div>
            )}
            <p className="mt-2 font-display text-[14px] leading-[1.35] text-muted-foreground">{t("disclaimer")}</p>
          </form>
        </section>
      )}
    </>
  );
}
