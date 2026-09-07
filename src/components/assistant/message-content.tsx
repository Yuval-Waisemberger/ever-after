import { Fragment } from "react";
import type { z } from "zod";
import type { clarificationSchema } from "@/lib/assistant/planning/policy";
import { assistantCopy, type AssistantLanguage } from "@/lib/assistant/language";

export function MessageContent({ text }: { text: string }) {
  return <>{text.split("\n").map((paragraph, index) => <p key={index} dir="auto" lang={/^[^a-zא-ת]*[א-ת]/i.test(paragraph) ? "he" : "en"} className="min-w-0 whitespace-pre-wrap text-start [overflow-wrap:anywhere]">{paragraph.split(/([A-Za-z][A-Za-z0-9]*(?:[ .:/?=&_%+#@'-]+[A-Za-z0-9]+)*|(?:₪\s*)?\d+(?:[.,/-]\d+)*(?:\s*₪)?)/g).map((part, i) => /[A-Za-z0-9]/.test(part) ? <bdi key={i} dir="ltr" className={!/[A-Za-z]/.test(part) && part.length <= 24 ? "whitespace-nowrap" : undefined}>{part}</bdi> : <Fragment key={i}>{part}</Fragment>)}</p>)}</>;
}
const questions = {
  he: { category: "באיזה שירות מדובר?", quotedPrice: "מה הסכום והמטבע של ההצעה?", coverageHours: "כמה שעות צילום כלולות?", videoIncluded: "האם ההצעה כוללת גם וידאו?", region: "באיזה אזור יתקיים האירוע?", weddingDate: "מה תאריך החתונה?", guestCount: "כמה מוזמנים צפויים?", totalBudgetMinor: "מה התקציב הכולל שלכם?" },
  en: { category: "Which service is this for?", quotedPrice: "What is the quoted amount and currency?", coverageHours: "How many hours of photography are included?", videoIncluded: "Is video included in the offer?", region: "Where will the event take place?", weddingDate: "What is your wedding date?", guestCount: "How many guests are expected?", totalBudgetMinor: "What is your total budget?" },
};
export function Clarification({ intent, language }: { intent: z.output<typeof clarificationSchema>; language: AssistantLanguage }) {
  if (!intent.required) return null;
  return <aside dir="auto" lang={language} className="mt-3 rounded-xl border border-wine/20 bg-paper p-3 text-start text-sm text-ink" aria-label={assistantCopy[language].clarify}>
    <p className="font-semibold">{assistantCopy[language].clarify}</p><ul className="mt-1 list-inside list-disc">{intent.missingFields.map(({ field }) => <li key={field}>{questions[language][field]}</li>)}</ul>
  </aside>;
}
