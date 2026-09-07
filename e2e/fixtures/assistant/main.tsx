import { createRoot } from "react-dom/client";
import { AssistantChat, type AssistantMessage } from "@/components/assistant/assistant-chat";
import "@/app/globals.css";
const he = new URLSearchParams(location.search).get("lang") === "he";
const texts = he ? ["מה המשימות שלנו השבוע?", "יש לכם 3 משימות פתוחות.\nבשבוע הקרוב: לדבר עם Maya Photography ולבדוק תשלום בסך 2,000 ₪ בתאריך 2026-09-12.", "Can you compare Maya Photography and Studio Rose?", "These are your saved vendors. Their listed prices are not current market evidence.", "האם המחיר כולל גם וידאו?"] : ["What tasks do we have this week?", "You have 3 open tasks. Call Maya Photography and check the ₪2,000 payment due 2026-09-12.", "מה לגבי Studio Rose?", "צריך לבדוק מה כלול בחבילה. אין כרגע מחקר מחירי שוק עדכני.", "Does the offer include video?"];
const messages: AssistantMessage[] = texts.map((content, index) => ({ id: String(index), role: index % 2 ? "assistant" : "user", content, source_labels: index % 2 ? ["Couple data", "Internal vendor database", "General guidance"] : [], created_at: "2026-09-07" }));
createRoot(document.getElementById("root")!).render(<main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10"><AssistantChat initialThreadId="00000000-0000-4000-8000-000000000001" initialMessages={messages} /></main>);
