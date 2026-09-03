"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, Bot, Database, Lightbulb, UserRound } from "lucide-react";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source_labels: string[];
  created_at: string;
};

const prompts = [
  "What tasks do we have this week?",
  "How much budget do we have left?",
  "Compare the vendors we are considering.",
  "What should we ask a DJ before signing?",
];

function SourceIcon({ source }: { source: string }) {
  return source === "Couple data" || source === "Internal vendor database" ? <Database className="size-3" /> : <Lightbulb className="size-3" />;
}

export function AssistantChat({ initialThreadId, initialMessages }: { initialThreadId: string | null; initialMessages: AssistantMessage[] }) {
  const [threadId, setThreadId] = useState(initialThreadId);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  async function send(event?: FormEvent, suggested?: string) {
    event?.preventDefault();
    const message = (suggested ?? input).trim();
    if (!message || sending) return;
    const optimistic: AssistantMessage = { id: crypto.randomUUID(), role: "user", content: message, source_labels: [], created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    setInput("");
    setSending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, threadId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The Assistant could not answer.");
      setThreadId(body.threadId);
      setMessages((current) => [...current, body.message]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Assistant could not answer.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-8 grid min-h-[650px] overflow-hidden rounded-3xl border bg-paper shadow-[0_18px_55px_rgb(77_52_33_/_8%)] lg:grid-cols-[280px_1fr]">
      <aside className="border-b bg-paper-muted p-5 lg:border-b-0 lg:border-r">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-wine">Try asking</p>
        <div className="mt-4 space-y-2">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => send(undefined, prompt)} className="w-full rounded-xl border bg-paper px-3 py-3 text-left text-sm leading-5 text-ink-soft transition hover:border-wine hover:text-wine">{prompt}</button>)}</div>
        <p className="mt-6 border-t pt-5 text-xs leading-5 text-ink-soft">Answers label whether they use your Couple data, the internal vendor database, or general guidance. Current web research is disabled until a provider is explicitly configured.</p>
      </aside>
      <section className="flex min-h-[620px] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7" aria-live="polite">
          {!messages.length ? <div className="mx-auto mt-14 max-w-lg text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-wine/10 text-wine"><Bot className="size-6" /></span><h2 className="font-display mt-5 text-3xl">What can I help you decide?</h2><p className="mt-3 text-sm leading-6 text-ink-soft">I use the wedding details, tasks, budget, payments, and vendors already in your workspace before asking another question.</p></div> : null}
          {messages.map((message) => <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>{message.role === "assistant" ? <span className="grid size-8 shrink-0 place-items-center rounded-full bg-wine/10 text-wine"><Bot className="size-4" /></span> : null}<div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-sm bg-wine text-white" : "rounded-bl-sm bg-canvas text-ink"}`}><p>{message.content}</p>{message.source_labels.length ? <div className="mt-3 flex flex-wrap gap-1.5 border-t border-current/10 pt-2">{message.source_labels.map((source) => <span key={source} className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[0.65rem] font-bold text-ink-soft"><SourceIcon source={source} />{source}</span>)}</div> : null}</div>{message.role === "user" ? <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"><UserRound className="size-4" /></span> : null}</article>)}
          {sending ? <div className="flex items-center gap-3 text-sm text-ink-soft"><span className="grid size-8 place-items-center rounded-full bg-wine/10 text-wine"><Bot className="size-4" /></span>Thinking with your wedding context…</div> : null}
          {error ? <p className="rounded-xl bg-red-900/5 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
        </div>
        <form onSubmit={send} className="border-t bg-paper p-4 sm:p-5"><div className="flex items-end gap-3 rounded-2xl border bg-canvas px-3 py-2 focus-within:border-wine focus-within:ring-2 focus-within:ring-wine/10"><label className="sr-only" htmlFor="assistant-message">Ask the Wedding Assistant</label><textarea id="assistant-message" value={input} onChange={(event) => setInput(event.target.value)} maxLength={3000} rows={2} placeholder="Ask about your wedding…" className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none" /><button disabled={!input.trim() || sending} className="grid size-10 shrink-0 place-items-center rounded-full bg-wine text-white disabled:opacity-40" aria-label="Send message"><ArrowUp className="size-4" /></button></div></form>
      </section>
    </div>
  );
}
