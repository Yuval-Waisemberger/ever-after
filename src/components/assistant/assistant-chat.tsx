"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, UserRound } from "lucide-react";
import { z } from "zod";
import { assistantCopy, selectResponseLanguage, sourceDisplayLabel, type AssistantLanguage } from "@/lib/assistant/language";
import { assistantResponseSchema } from "@/lib/assistant/types";
import { clarificationSchema } from "@/lib/assistant/planning/policy";
import { Clarification, MessageContent } from "./message-content";

const messageSchema = z.object({ id: z.string().min(1), role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(16000), source_labels: z.array(z.string().max(100)).max(4), created_at: z.string(), clarificationIntent: clarificationSchema.optional() });
export type AssistantMessage = z.output<typeof messageSchema>;
const replySchema = z.object({ threadId: z.uuid(), message: messageSchema, agent: assistantResponseSchema.optional() });

export function AssistantChat({ initialThreadId, initialMessages, initialLoadError = false }: { initialThreadId: string | null; initialMessages: AssistantMessage[]; initialLoadError?: boolean }) {
  const [threadId, setThreadId] = useState(initialThreadId);
  const [messages, setMessages] = useState(initialMessages);
  const [recentLanguage, setRecentLanguage] = useState<AssistantLanguage>(() => initialMessages.reduce<AssistantLanguage>((language, message) => selectResponseLanguage(message.content, language).language, "en"));
  const [preference, setPreference] = useState<"auto" | AssistantLanguage>("auto");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<{ text: string; language: AssistantLanguage; intent?: z.output<typeof clarificationSchema> }>();
  const [retryMessage, setRetryMessage] = useState<string>();
  const textarea = useRef<HTMLTextAreaElement>(null), bottom = useRef<HTMLDivElement>(null), inFlight = useRef(false);
  const language = selectResponseLanguage(input, recentLanguage, preference === "auto" ? undefined : preference).language;
  const copy = assistantCopy[language];
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages, sending, failure]);

  async function send(event?: FormEvent, suggested?: string) {
    event?.preventDefault();
    const message = (suggested ?? input).trim();
    if (!message || inFlight.current || initialLoadError) return;
    inFlight.current = true;
    const responseLanguage = selectResponseLanguage(message, recentLanguage, preference === "auto" ? undefined : preference).language;
    const labels = assistantCopy[responseLanguage];
    const optimistic: AssistantMessage = { id: crypto.randomUUID(), role: "user", content: message, source_labels: [], created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]); setInput(""); setSending(true); setFailure(undefined); setRetryMessage(undefined); setRecentLanguage(responseLanguage);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, threadId, recentLanguage, ...(preference !== "auto" ? { requestedLanguage: preference } : {}) }) });
      const body = await response.json();
      if (z.uuid().safeParse(body?.threadId).success) setThreadId(body.threadId);
      if (!response.ok) {
        const parsed = assistantResponseSchema.safeParse(body?.agent), agent = parsed.success ? parsed.data : undefined;
        const code = agent?.error?.code ?? body?.errorCode;
        const text = code === "RESEARCH_UNAVAILABLE" ? labels.research : code === "CONTEXT_UNAVAILABLE" ? (responseLanguage === "he" ? "לא הצלחתי לגשת לנתוני החתונה כרגע. נסו שוב." : "I couldn't access your wedding information right now. Please try again.") : code === "PROVIDER_UNAVAILABLE" ? labels.provider : code === "MESSAGE_NOT_SAVED" ? labels.saveUser : code === "ANSWER_NOT_SAVED" ? labels.saveAnswer : code === "AUTH_REQUIRED" ? labels.auth : labels.error;
        setFailure({ text, language: responseLanguage, intent: agent?.clarificationIntent });
        // Only an explicit failed user insert is safe to retry without duplicating persisted history.
        if (code === "MESSAGE_NOT_SAVED") { setMessages((current) => current.filter((item) => item.id !== optimistic.id)); setRetryMessage(message); setInput(message); }
        return;
      }
      const result = replySchema.parse(body);
      if (result.message.role !== "assistant") throw new Error("invalid_response");
      setMessages((current) => [...current, { ...result.message, clarificationIntent: result.agent?.clarificationIntent }]);
      setRecentLanguage(result.agent?.language ?? responseLanguage);
    } catch { setFailure({ text: labels.error, language: responseLanguage }); }
    finally { setSending(false); inFlight.current = false; textarea.current?.focus(); }
  }

  return <div dir="ltr" lang={language} className="min-w-0">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div dir="auto" className="min-w-0 flex-1 text-start"><h1 className="font-display text-3xl text-ink sm:text-4xl">{copy.title}</h1><p className="mt-2 text-sm leading-6 text-ink-soft">{copy.intro}</p></div>
      <label className="flex shrink-0 flex-col gap-1 text-xs text-ink-soft" dir="auto">{copy.language}<select aria-label={copy.language} value={preference} onChange={(event) => setPreference(event.target.value as typeof preference)} className="min-h-11 rounded-lg border bg-paper px-3 text-sm text-ink"><option value="auto">{copy.auto}</option><option value="he">עברית</option><option value="en">English</option></select></label>
    </header>
    <div className="assistant-surface grid min-w-0 overflow-hidden border bg-paper lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="assistant-prompts min-w-0 border-b p-4 lg:border-b-0 lg:border-r" dir="auto">
        <p className="text-sm font-semibold text-wine">{copy.tryAsking}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">{copy.prompts.map((prompt) => <button key={prompt} type="button" disabled={sending || initialLoadError} onClick={() => send(undefined, prompt)} className="min-h-11 min-w-0 rounded-xl border bg-paper px-3 py-3 text-start text-sm leading-5 text-ink-soft transition hover:border-wine hover:text-wine disabled:opacity-50">{prompt}</button>)}</div>
        <p className="mt-4 border-t pt-4 text-xs leading-5 text-ink-soft">{copy.note}</p>
      </aside>
      <section className="assistant-conversation flex min-w-0 flex-col">
        <div role="log" aria-label={copy.title} aria-live="polite" aria-relevant="additions text" className="h-[min(60vh,600px)] min-h-72 space-y-5 overflow-y-auto p-3 sm:p-5">
          {!messages.length ? <div className="mx-auto my-10 max-w-lg text-center" dir="auto"><Bot aria-hidden="true" className="mx-auto size-8 text-wine" /><h2 className="font-display mt-4 text-2xl">{copy.emptyTitle}</h2><p className="mt-3 text-sm leading-6 text-ink-soft">{copy.empty}</p></div> : null}
          {messages.map((message) => {
            const messageLanguage = selectResponseLanguage(message.content, recentLanguage).language;
            const sources = [...new Set(message.source_labels)].map((label) => sourceDisplayLabel(label, messageLanguage)).filter((label): label is string => Boolean(label));
            return <article key={message.id} data-role={message.role} className={`flex min-w-0 gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" ? <Bot aria-hidden="true" className="mt-2 size-5 shrink-0 text-wine" /> : null}
              <div data-bubble className={`min-w-0 max-w-[88%] rounded-2xl px-3 py-3 text-sm leading-6 sm:max-w-[85%] sm:px-4 ${message.role === "user" ? "rounded-br-sm bg-wine text-white" : "rounded-bl-sm bg-canvas text-ink"}`}>
                <MessageContent text={message.content} />
                {sources.length ? <ul aria-label={assistantCopy[messageLanguage].sources} className="mt-3 flex flex-wrap gap-1.5 border-t border-current/10 pt-2">{sources.map((source) => <li key={source} dir="auto" className="max-w-full rounded-full bg-paper px-2 py-1 text-xs leading-4 text-ink-soft [overflow-wrap:anywhere]">{source}</li>)}</ul> : null}
                {message.clarificationIntent ? <Clarification intent={message.clarificationIntent} language={messageLanguage} /> : null}
              </div>{message.role === "user" ? <UserRound aria-hidden="true" className="mt-2 size-5 shrink-0 text-wine" /> : null}
            </article>;
          })}
          {sending ? <p role="status" dir="auto" className="text-sm text-ink-soft">{copy.sending}</p> : null}
          {initialLoadError ? <p role="alert" dir="auto" className="rounded-xl bg-canvas p-3 text-sm text-wine">{copy.thread}</p> : null}
          {failure ? <div dir="auto" className="rounded-xl border border-wine/20 bg-canvas p-3 text-sm text-wine"><p role="alert">{failure.text}</p>{failure.intent ? <Clarification intent={failure.intent} language={failure.language} /> : null}{retryMessage ? <button type="button" disabled={sending} className="mt-2 min-h-11 underline" onClick={() => send(undefined, retryMessage)}>{assistantCopy[failure.language].retry}</button> : null}</div> : null}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="min-w-0 border-t bg-paper p-3 sm:p-4"><div className="flex min-w-0 items-end gap-2 rounded-2xl border bg-canvas px-2 py-2 focus-within:border-wine focus-within:ring-2 focus-within:ring-wine/10"><label className="sr-only" htmlFor="assistant-message">{copy.inputLabel}</label><textarea ref={textarea} id="assistant-message" dir="auto" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} maxLength={3000} rows={2} placeholder={copy.placeholder} disabled={initialLoadError} className="max-h-40 min-h-11 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-start text-base outline-none" /><button disabled={!input.trim() || sending || initialLoadError} className="grid size-11 shrink-0 place-items-center rounded-full bg-wine text-white disabled:opacity-40" aria-label={copy.send}><ArrowUp aria-hidden="true" className="size-4" /></button></div></form>
      </section>
    </div>
  </div>;
}
