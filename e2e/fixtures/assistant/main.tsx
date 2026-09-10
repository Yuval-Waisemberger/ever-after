import { createRoot } from "react-dom/client";
import { AssistantChat, type AssistantMessage } from "@/components/assistant/assistant-chat";
import { AppShell } from "@/components/layout/app-shell";
import "@/app/globals.css";
import "@/app/eligible-consistency.css";
import "@/app/product.css";
import "@/app/couple-planning.css";
import "@/app/(couple)/assistant/assistant.css";
const he = new URLSearchParams(location.search).get("lang") === "he";
const texts = he ? ["מה המשימות שלנו השבוע?", "יש לכם 3 משימות פתוחות.\nבשבוע הקרוב: לדבר עם Maya Photography ולבדוק תשלום בסך 2,000 ₪ בתאריך 2026-09-12.", "Can you compare Maya Photography and Studio Rose?", "These are your saved vendors. Their listed prices are not current market evidence.", "האם המחיר כולל גם וידאו?"] : ["What tasks do we have this week?", "You have 3 open tasks. Call Maya Photography and check the ₪2,000 payment due 2026-09-12.", "מה לגבי Studio Rose?", "צריך לבדוק מה כלול בחבילה. אין כרגע מחקר מחירי שוק עדכני.", "Does the offer include video?"];
texts[1] = he ? "**לקראת הפגישה עם הצלם**\n\nכדאי להתמקד בחוויה ובמה שכלול בחבילה.\n\n1. בקשו לראות גלריות של חתונות מלאות.\n2. בררו כמה שעות צילום כלולות.\n3. שאלו על גיבוי ועל מועד מסירת התמונות.\n\n- רשמו את השאלות מראש.\n- השאירו מקום לשיחה על הסגנון שלכם." : "**Questions for your photographer**\n\nFocus on what the day will feel like and what is included in the package.\n\n1. **Style and consistency:** ask to see two complete wedding galleries.\n2. **Coverage:** confirm hours, photographers and overtime arrangements.\n3. **Delivery:** ask when and how the edited photos will arrive.\n\n- Discuss the backup plan.\n- Ask how you will coordinate before the wedding.";
const messages: AssistantMessage[] = texts.map((content, index) => ({ id: String(index), role: index % 2 ? "assistant" : "user", content, source_labels: index % 2 ? ["Couple data", "Internal vendor database", "General guidance"] : [], created_at: "2026-09-07" }));
const params = new URLSearchParams(location.search);
const blank = params.has("blank");
const id = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const threads = [{ id, title: "Our wedding plans" }, { id: otherId, title: "Budget and the next steps for our celebration" }];
const content = <main className="ea-consistent-page mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
  <AssistantChat initialThreadId={blank ? null : id} initialMessages={blank ? [] : messages}
    initialLoadError={params.has("unavailable")}
    initialHistory={{ threads: params.has("empty") ? [] : threads, hasMore: false }}
    contextChips={params.has("noContext") ? [] : ["Romantic · Vintage", "Central Israel", "240 guests", "₪170,000 budget", "Photography priority"]}
    readHistory={async () => ({ threads: [], hasMore: false })}
    readConversation={async (selectedId) => {
      if (params.has("historyError")) return null;
      if (params.has("holdHistory")) await new Promise<void>(resolve => window.addEventListener("release-history", () => resolve(), { once: true }));
      return { messages: selectedId === id ? messages : [{ id: "budget-message", role: "assistant", content: "Your recorded budget is ₪170,000. This is a fixture summary.", source_labels: ["Couple data"], created_at: "2026-09-07" }], hasMore: false };
    }} />
</main>;
createRoot(document.getElementById("root")!).render(params.has("shell") ? <AppShell role="couple" displayName="Fixture Couple">{content}</AppShell> : content);
