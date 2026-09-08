"use client";

import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, MessageSquare, Plus, Sparkles, UserRound, X, History } from "lucide-react";
import { z } from "zod";
import { assistantCopy, selectResponseLanguage, sourceDisplayLabel, type AssistantLanguage } from "@/lib/assistant/language";
import { assistantResponseSchema } from "@/lib/assistant/types";
import { clarificationSchema } from "@/lib/assistant/planning/policy";
import type { ConversationReader, ConversationSummary, HistoryPage, HistoryReader } from "./presentation";
import { Clarification, MessageContent } from "./message-content";

const messageSchema = z.object({ id: z.string().min(1), role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(16000), source_labels: z.array(z.string().max(100)).max(4), created_at: z.string(), clarificationIntent: clarificationSchema.optional() });
export type AssistantMessage = z.output<typeof messageSchema>;
const replySchema = z.object({ threadId: z.uuid(), message: messageSchema, agent: assistantResponseSchema.optional() });

type Props = {
  initialThreadId: string | null; initialMessages: AssistantMessage[]; initialLoadError?: boolean;
  initialHistory?: HistoryPage; readHistory?: HistoryReader; readConversation?: ConversationReader; contextChips?: string[];
};
export function AssistantChat({ initialThreadId, initialMessages, initialLoadError = false, initialHistory, readHistory, readConversation, contextChips = [] }: Props) {
  const [threadId, setThreadId] = useState(initialThreadId);
  const [messages, setMessages] = useState(initialMessages);
  const [recentLanguage, setRecentLanguage] = useState<AssistantLanguage>(() => initialMessages.reduce<AssistantLanguage>((language, message) => selectResponseLanguage(message.content, language).language, "en"));
  const [preference, setPreference] = useState<"auto" | AssistantLanguage>("auto");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<{ text: string; language: AssistantLanguage; intent?: z.output<typeof clarificationSchema> }>();
  const [retryMessage, setRetryMessage] = useState<string>();
  const [threads, setThreads] = useState<ConversationSummary[]>(initialHistory?.threads ?? []);
  const [hasMoreThreads, setHasMoreThreads] = useState(initialHistory?.hasMore ?? false);
  const [hasOlder, setHasOlder] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  const drawer = useRef<HTMLDialogElement>(null);
  const historyTrigger = useRef<HTMLButtonElement>(null);
  const selection = useRef(0), historyOffset = useRef(initialHistory?.threads.length ?? 0);
  const restoreComposerFocus = useRef(false);
  const olderScroll = useRef<{ top: number; height: number } | null>(null);
  const messageOffset = useRef(initialMessages.length);
  const textarea = useRef<HTMLTextAreaElement>(null), bottom = useRef<HTMLDivElement>(null), inFlight = useRef(false);
  const language = selectResponseLanguage(input, recentLanguage, preference === "auto" ? undefined : preference).language;
  const copy = assistantCopy[language];
  useEffect(() => {
    const log = bottom.current?.parentElement;
    if (olderScroll.current && log) { log.scrollTop = olderScroll.current.top + log.scrollHeight - olderScroll.current.height; olderScroll.current = null; }
    else if (sending || failure || messages.length) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, sending, failure]);
  useEffect(() => {
    if (!sending && restoreComposerFocus.current) { restoreComposerFocus.current = false; textarea.current?.focus(); }
  }, [sending]);
  useEffect(() => {
    if (drawerOpen) drawer.current?.showModal();
    else if (drawer.current?.open) drawer.current.close();
  }, [drawerOpen]);

  function closeDrawer() { setDrawerOpen(false); historyTrigger.current?.focus(); }
  function newChat() {
    if (inFlight.current) return;
    selection.current += 1; setHistoryBusy(false); setHistoryError(false);
    setThreadId(null); setMessages([]); setInput(""); setFailure(undefined); setRetryMessage(undefined);
    setRecentLanguage("en"); setHasOlder(false); messageOffset.current = 0;
    setViewKey((key) => key + 1); closeDrawer(); textarea.current?.focus();
  }
  async function openConversation(id: string) {
    if (inFlight.current || !readConversation) return;
    const request = ++selection.current;
    setHistoryBusy(true); setHistoryError(false);
    try {
      const result = await readConversation(id, 0);
      if (request !== selection.current) return;
      if (!result) { setHistoryError(true); return; }
      setThreadId(id); setMessages(result.messages); setHasOlder(result.hasMore); messageOffset.current = result.messages.length;
      setInput(""); setFailure(undefined); setRetryMessage(undefined);
      setRecentLanguage(result.messages.reduce<AssistantLanguage>((current, item) => selectResponseLanguage(item.content, current).language, "en"));
      setViewKey((key) => key + 1); closeDrawer();
    } catch { if (request === selection.current) setHistoryError(true); }
    finally { if (request === selection.current) setHistoryBusy(false); }
  }
  async function moreHistory() {
    if (!readHistory || historyBusy) return;
    const request = selection.current; setHistoryBusy(true); setHistoryError(false);
    try {
      const result = await readHistory(historyOffset.current);
      if (request !== selection.current) return;
      if (!result) { setHistoryError(true); return; }
      historyOffset.current += result.threads.length;
      setThreads((current) => [...new Map([...current, ...result.threads].map((item) => [item.id, item])).values()]);
      setHasMoreThreads(result.hasMore);
    } catch { if (request === selection.current) setHistoryError(true); }
    finally { if (request === selection.current) setHistoryBusy(false); }
  }
  async function olderMessages() {
    if (!readConversation || !threadId || historyBusy) return;
    const request = selection.current; setHistoryBusy(true); setHistoryError(false);
    try {
      const result = await readConversation(threadId, messageOffset.current);
      if (request !== selection.current) return;
      if (!result) { setHistoryError(true); return; }
      const log = bottom.current?.parentElement;
      if (log) olderScroll.current = { top: log.scrollTop, height: log.scrollHeight };
      messageOffset.current += result.messages.length;
      setMessages((current) => [...result.messages, ...current]); setHasOlder(result.hasMore);
    } catch { if (request === selection.current) setHistoryError(true); }
    finally { if (request === selection.current) setHistoryBusy(false); }
  }

  async function send(event?: FormEvent, suggested?: string) {
    event?.preventDefault();
    const message = (suggested ?? input).trim();
    if (!message || inFlight.current || historyBusy || initialLoadError) return;
    inFlight.current = true;
    const responseLanguage = selectResponseLanguage(message, recentLanguage, preference === "auto" ? undefined : preference).language;
    const labels = assistantCopy[responseLanguage];
    const optimistic: AssistantMessage = { id: crypto.randomUUID(), role: "user", content: message, source_labels: [], created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]); setInput(message); setSending(true); setFailure(undefined); setRetryMessage(undefined); setRecentLanguage(responseLanguage);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, threadId, recentLanguage, ...(preference !== "auto" ? { requestedLanguage: preference } : {}) }) });
      const body = await response.json();
      if (z.uuid().safeParse(body?.threadId).success) {
        setThreadId(body.threadId);
        setThreads((current) => current.some((item) => item.id === body.threadId) ? current : [{ id: body.threadId, title: message.slice(0, 80) }, ...current]);
      }
      if (!response.ok) {
        const parsed = assistantResponseSchema.safeParse(body?.agent), agent = parsed.success ? parsed.data : undefined;
        const code = agent?.error?.code ?? body?.errorCode;
        if (agent || code === "ANSWER_NOT_SAVED") { setInput(""); messageOffset.current += 1; }
        const text = code === "RESEARCH_UNAVAILABLE" ? labels.research : code === "CONTEXT_UNAVAILABLE" ? (responseLanguage === "he" ? "לא הצלחתי לגשת לנתוני החתונה כרגע. נסו שוב." : "I couldn't access your wedding information right now. Please try again.") : code === "PROVIDER_UNAVAILABLE" ? labels.provider : code === "MESSAGE_NOT_SAVED" ? labels.saveUser : code === "ANSWER_NOT_SAVED" ? labels.saveAnswer : code === "AUTH_REQUIRED" ? labels.auth : labels.error;
        setFailure({ text, language: responseLanguage, intent: agent?.clarificationIntent });
        // Only an explicit failed user insert is safe to retry without duplicating persisted history.
        if (code === "MESSAGE_NOT_SAVED") { setMessages((current) => current.filter((item) => item.id !== optimistic.id)); setRetryMessage(message); setInput(message); }
        return;
      }
      const result = replySchema.parse(body);
      if (result.message.role !== "assistant") throw new Error("invalid_response");
      setMessages((current) => [...current, { ...result.message, clarificationIntent: result.agent?.clarificationIntent }]);
      messageOffset.current += 2;
      setRecentLanguage(result.agent?.language ?? responseLanguage); setInput("");
    } catch { setFailure({ text: labels.error, language: responseLanguage }); }
    finally { restoreComposerFocus.current = true; setSending(false); inFlight.current = false; }
  }

  const english = language === "en";
  const newLabel = english ? "New chat" : "שיחה חדשה";
  const historyLabel = english ? "Conversations" : "שיחות";
  const pendingLabel = english ? "Considering your wedding…" : "מקדיש מחשבה לחתונה שלכם…";
  return <div dir="ltr" lang={language} className="assistant-experience">
    <header className="assistant-heading">
      <div dir="auto"><p className="eyebrow">EVER AFTER · {english ? "YOUR PLANNING COMPANION" : "לצדכם בתכנון"}</p><h1>{copy.title}</h1><p>{english ? "A thoughtful space for everything before your ever after." : copy.intro}</p></div>
      <label className="assistant-language" dir="auto">{copy.language}<select aria-label={copy.language} value={preference} onChange={(event) => setPreference(event.target.value as typeof preference)}><option value="auto">{copy.auto}</option><option value="en">English</option><option value="he">עברית</option></select></label>
    </header>
    <div className="assistant-workspace">
      <aside className="assistant-history" dir="auto"><ConversationList english={english} historyLabel={historyLabel} newLabel={newLabel} threads={threads} threadId={threadId} sending={sending} historyBusy={historyBusy} hasMoreThreads={hasMoreThreads} newChat={newChat} openConversation={openConversation} moreHistory={moreHistory} /></aside>
      <section className="assistant-chat-panel">
        <div className="assistant-chat-toolbar">
          <button ref={historyTrigger} className="ea-icon-button assistant-history-trigger" aria-label={historyLabel} aria-haspopup="dialog" onClick={() => setDrawerOpen(true)}><History size={19} aria-hidden="true" /></button>
          <span dir="auto">{threads.find((thread) => thread.id === threadId)?.title || newLabel}</span>
          <button className="ea-icon-button assistant-mobile-new" aria-label={newLabel} onClick={newChat} disabled={sending}><Plus size={20} aria-hidden="true" /></button>
        </div>
        {historyBusy ? <p className="assistant-read-status" role="status">{english ? "Opening your conversations…" : "טוען את השיחות שלכם…"}</p> : null}
        {historyError ? <p className="assistant-error" role="alert">{copy.thread}</p> : null}
        <div key={viewKey} className="assistant-view">
          <div role="log" aria-label={copy.title} aria-live="polite" aria-relevant="additions text" className="assistant-message-log">
            {hasOlder ? <button type="button" className="ea-text-action assistant-more" onClick={olderMessages} disabled={historyBusy || sending}>{english ? "Earlier messages" : "הודעות קודמות"}</button> : null}
            {!messages.length ? <div className="assistant-blank" dir="auto">
              <div className="assistant-identity" aria-hidden="true">✦ <span>❦</span> ✦</div>
              <p className="eyebrow">{english ? "A MOMENT OF CLARITY" : "רגע של בהירות"}</p>
              <h2>{copy.emptyTitle}</h2><p>{english ? "Bring your questions. Let’s make a little more room for the joy of planning." : "הביאו את השאלות שלכם. נפנה יחד קצת יותר מקום לשמחה שבתכנון."}</p>
              <div className="assistant-suggestions">{copy.prompts.map((prompt) => <button key={prompt} type="button" disabled={sending || historyBusy || initialLoadError} onClick={() => { setInput(prompt); textarea.current?.focus(); }}><span>{prompt}</span><ArrowUp size={15} aria-hidden="true" /></button>)}</div>
            </div> : null}
            {contextChips.length && (sending || messages.length > 0) ? <ul className="assistant-context" aria-label={english ? "Your wedding context" : "פרטי החתונה שלכם"}>{contextChips.slice(0, 5).map((chip, index) => <li key={chip} style={{ "--chip-delay": `${index * 100}ms` } as CSSProperties}>{chip}</li>)}</ul> : null}
            {messages.map((message) => {
              const messageLanguage = selectResponseLanguage(message.content, recentLanguage).language;
              const sources = [...new Set(message.source_labels)].map((label) => sourceDisplayLabel(label, messageLanguage)).filter((label): label is string => Boolean(label));
              return <article key={message.id} data-role={message.role} className={`assistant-message flex min-w-0 gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" ? <Sparkles aria-hidden="true" className="assistant-avatar" /> : null}
                <div data-bubble>
                  <MessageContent text={message.content} />
                  {sources.length ? <ul aria-label={assistantCopy[messageLanguage].sources} className="assistant-sources">{sources.map((source, index) => <li key={source} dir="auto" style={{ "--chip-delay": `${index * 100}ms` } as CSSProperties}>{source}</li>)}</ul> : null}
                  {message.clarificationIntent ? <Clarification intent={message.clarificationIntent} language={messageLanguage} /> : null}
                </div>{message.role === "user" ? <UserRound aria-hidden="true" className="assistant-avatar" /> : null}
              </article>;
            })}
            {sending ? <div role="status" dir="auto" className="assistant-pending"><div aria-hidden="true" className="assistant-pending-ornament"><span>✦</span><span>❦</span><span>✦</span></div><p>{pendingLabel}</p></div> : null}
            {initialLoadError ? <p role="alert" dir="auto" className="assistant-error">{copy.thread}</p> : null}
            {failure ? <div dir="auto" className="assistant-error"><p role="alert">{failure.text}</p>{failure.intent ? <Clarification intent={failure.intent} language={failure.language} /> : null}{retryMessage ? <button type="button" disabled={sending} className="ea-text-action assistant-more" onClick={() => send(undefined, retryMessage)}>{assistantCopy[failure.language].retry}</button> : null}</div> : null}
            <div ref={bottom} />
          </div>
        </div>
        <form onSubmit={send} className="assistant-composer">
          <div className="assistant-composer-field"><label className="sr-only" htmlFor="assistant-message">{copy.inputLabel}</label><textarea ref={textarea} id="assistant-message" dir="auto" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} maxLength={3000} rows={2} placeholder={copy.placeholder} disabled={sending || historyBusy || initialLoadError} /><button disabled={!input.trim() || sending || historyBusy || initialLoadError} className="ea-button ea-button--primary assistant-send" aria-label={copy.send}><ArrowUp aria-hidden="true" size={19} /></button></div>
          <p className="assistant-composer-note" dir="auto">{english ? "Local planning summaries · Live AI and research are not connected." : copy.note}</p>
        </form>
      </section>
    </div>
    <dialog ref={drawer} className="assistant-drawer" aria-label={historyLabel} onCancel={closeDrawer} onClose={() => setDrawerOpen(false)}>
      <button className="ea-icon-button assistant-drawer-close" aria-label={english ? "Close conversations" : "סגירת השיחות"} onClick={closeDrawer}><X size={20} aria-hidden="true" /></button>
      {drawerOpen ? <ConversationList english={english} historyLabel={historyLabel} newLabel={newLabel} threads={threads} threadId={threadId} sending={sending} historyBusy={historyBusy} hasMoreThreads={hasMoreThreads} newChat={newChat} openConversation={openConversation} moreHistory={moreHistory} /> : null}
      {drawerOpen && historyBusy ? <p role="status" className="assistant-read-status">{english ? "Opening your conversations…" : "טוען את השיחות שלכם…"}</p> : null}
      {drawerOpen && historyError ? <p role="alert" className="assistant-error">{copy.thread}</p> : null}
    </dialog>
  </div>;
}

function ConversationList({ english, historyLabel, newLabel, threads, threadId, sending, historyBusy, hasMoreThreads, newChat, openConversation, moreHistory }: {
  english: boolean; historyLabel: string; newLabel: string; threads: ConversationSummary[]; threadId: string | null;
  sending: boolean; historyBusy: boolean; hasMoreThreads: boolean;
  newChat: () => void; openConversation: (id: string) => void; moreHistory: () => void;
}) {
    return <>
      <div className="assistant-history-heading"><span className="eyebrow">{historyLabel}</span></div>
      <button className="ea-button ea-button--secondary assistant-new" onClick={newChat} disabled={sending}><Plus size={16} aria-hidden="true" />{newLabel}</button>
      <nav aria-label={historyLabel} className="assistant-thread-list">
        {threads.map((thread) => <button key={thread.id} type="button" aria-current={threadId === thread.id ? "page" : undefined} disabled={sending || historyBusy} onClick={() => openConversation(thread.id)} className="assistant-thread"><MessageSquare size={15} aria-hidden="true" /><span dir="auto">{thread.title || newLabel}</span></button>)}
        {!threads.length ? <p className="assistant-history-empty">{english ? "Your conversations will find a home here." : "השיחות שלכם יופיעו כאן."}</p> : null}
      </nav>
      {hasMoreThreads ? <button className="ea-text-action assistant-more" disabled={historyBusy || sending} onClick={moreHistory}>{english ? "More conversations" : "שיחות נוספות"}</button> : null}
      <p className="assistant-history-note">{english ? "A little clarity, for every part of your day." : "קצת יותר בהירות, בכל שלב בדרך."}</p>
    </>;
  }
