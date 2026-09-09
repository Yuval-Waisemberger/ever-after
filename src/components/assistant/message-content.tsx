import ReactMarkdown from "react-markdown";
import type { z } from "zod";
import type { clarificationSchema } from "@/lib/assistant/planning/policy";
import { assistantCopy, type AssistantLanguage } from "@/lib/assistant/language";

export function MessageContent({ text }: { text: string }) {
  const hebrew = /^[^a-zא-ת]*[א-ת]/i.test(text);
  return <div className="assistant-markdown" dir={hebrew ? "rtl" : "ltr"} lang={hebrew ? "he" : "en"}>
    <ReactMarkdown skipHtml allowedElements={["p", "strong", "em", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a", "br"]} unwrapDisallowed components={{
      a: ({ href, children }) => href && /^(https?:\/\/|mailto:)/i.test(href) ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
    }}>{text}</ReactMarkdown>
  </div>;
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
