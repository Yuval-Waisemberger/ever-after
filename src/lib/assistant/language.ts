import { z } from "zod";

export const assistantLanguage = z.enum(["he", "en"]);
export type AssistantLanguage = z.output<typeof assistantLanguage>;
export function selectResponseLanguage(message: string, recentLanguage?: AssistantLanguage, requestedLanguage?: AssistantLanguage) {
  const explicit = /(?:answer|reply|respond|speak)(?: to me)?\s+(?:only\s+)?in\s+(hebrew|english)|\b(hebrew|english)\s+please\b/i.exec(message);
  const hebrewRequest = /(?:ענה|עני|תענה|תעני|השב|השיבי|תענו|אפשר לענות|בבקשה לענות)[^.!?\n]{0,25}?(בעברית|באנגלית)/.exec(message);
  const textRequest = explicit ? ((explicit[1] ?? explicit[2]).toLowerCase() === "hebrew" ? "he" : "en") : hebrewRequest ? (hebrewRequest[1] === "בעברית" ? "he" : "en") : undefined;
  if (textRequest || requestedLanguage) return { language: textRequest ?? requestedLanguage!, basis: "explicit" as const };
  const he = (message.match(/[א-ת]/g) ?? []).length, en = (message.match(/[a-z]/gi) ?? []).length;
  if (he >= 2 && he > en * 1.4) return { language: "he" as const, basis: "detected" as const };
  if (en >= 2 && en > he * 1.4) return { language: "en" as const, basis: "detected" as const };
  return { language: recentLanguage ?? (he > en ? "he" : "en"), basis: recentLanguage ? "recent" as const : "default" as const };
}
export const languageDirection = (language: AssistantLanguage) => language === "he" ? "rtl" : "ltr";

export const assistantCopy = {
  en: {
    title: "Wedding Assistant", intro: "Your wedding details, tasks, vendors and budget — in Hebrew or English.",
    tryAsking: "Try asking", emptyTitle: "Where shall we start?", empty: "Ask about your plans. This local Assistant provides simple summaries; natural AI reasoning and live research are not connected yet.",
    note: "Sources distinguish your wedding records, Marketplace facts and general guidance. Live research is not connected.",
    placeholder: "Ask about your wedding…", inputLabel: "Ask the Wedding Assistant", send: "Send message", sending: "Reading your wedding context…", retry: "Try again", language: "Response language", auto: "Automatic",
    sources: "Answer sources", clarify: "One detail to clarify", error: "The Wedding Assistant could not complete this request. Please try again.",
    provider: "The Wedding Assistant is unavailable with the current configuration. Please try again later.",
    saveUser: "Your message could not be saved. Please try again.", saveAnswer: "The answer could not be saved.",
    auth: "Please sign in as a Couple to use the Wedding Assistant.", invalid: "Enter a shorter, valid question.", thread: "The conversation could not be accessed.",
    redirect: "I'm here to help with your wedding planning. Ask me about your tasks, vendors, budget, guests, timeline, or wedding details.",
    research: "I cannot verify current wedding-market prices or procedures because live research is not connected yet. Ever After Marketplace prices are not a real-world market benchmark.",
    verify: "The Wedding Assistant couldn't verify this answer. Please try again.",
    prompts: ["What tasks do we have this week?", "How much budget do we have left?", "Which vendors have we booked?", "How many guests are awaiting a response?"],
  },
  he: {
    title: "עוזר תכנון החתונה", intro: "פרטי החתונה, המשימות, הספקים והתקציב שלכם — בעברית או באנגלית.",
    tryAsking: "אפשר לשאול", emptyTitle: "מאיפה נתחיל?", empty: "שאלו על התוכניות שלכם. העוזר המקומי מציג סיכומים פשוטים; בינה מלאכותית ושירותי מחקר עדכני עדיין לא מחוברים.",
    note: "המקורות מבדילים בין נתוני החתונה שלכם, מידע מה־Marketplace והכוונה כללית. מחקר עדכני עדיין לא מחובר.",
    placeholder: "מה תרצו לדעת על החתונה שלכם?", inputLabel: "שאלה לעוזר תכנון החתונה", send: "שליחת הודעה", sending: "בודק את נתוני החתונה שלכם…", retry: "ניסיון נוסף", language: "שפת התשובה", auto: "אוטומטי",
    sources: "מקורות התשובה", clarify: "פרט קטן להבהרה", error: "לא הצלחתי להשלים את הבקשה כרגע. נסו שוב.",
    provider: "עוזר החתונה אינו זמין בהגדרות הנוכחיות. נסו שוב מאוחר יותר.",
    saveUser: "לא הצלחתי לשמור את ההודעה שלכם. נסו שוב.", saveAnswer: "לא הצלחתי לשמור את התשובה.",
    auth: "כדי להשתמש בעוזר החתונה, התחברו לחשבון זוג.", invalid: "כתבו שאלה תקינה וקצרה יותר.", thread: "לא הצלחתי לגשת לשיחה כרגע.",
    redirect: "אני כאן לעזור בתכנון החתונה שלכם — משימות, ספקים, תקציב, מוזמנים, לוחות זמנים ופרטי האירוע.",
    research: "עדיין אין חיבור למחקר עדכני, ולכן איני יכול לאמת מחירי שוק או נהלים עדכניים. המחירים ב־Ever After Marketplace אינם מדד למחירי השוק כולו.",
    verify: "לא הצלחתי לאמת את התשובה כרגע. נסו שוב.",
    prompts: ["מה המשימות שלי השבוע?", "כמה תקציב נשאר לנו?", "אילו ספקים כבר סגרנו?", "כמה מוזמנים עדיין לא ענו?"],
  },
} as const;
export function contextUnavailableText(language: AssistantLanguage, section: string) {
  const labels: Record<string, [string, string]> = { wedding: ["wedding details", "פרטי החתונה"], tasks: ["tasks", "המשימות"], budget: ["budget and payment information", "נתוני התקציב והתשלומים"], vendors: ["vendor information", "פרטי הספקים"], guestList: ["Guest List summary", "סיכום רשימת המוזמנים"] };
  return language === "he" ? `לא הצלחתי לגשת ל${labels[section]?.[1] ?? "נתוני החתונה"} כרגע. נסו שוב.` : `I couldn't access your ${labels[section]?.[0] ?? "wedding information"} right now. Please try again.`;
}
export function sourceDisplayLabel(source: string, language: AssistantLanguage) {
  const labels: Record<string, [string, string]> = { "Couple data": ["Couple data", "נתוני החתונה"], "Internal vendor database": ["Ever After Marketplace", "Ever After Marketplace"], "Web research": ["Current external evidence", "מקורות חיצוניים עדכניים"], "General guidance": ["General wedding guidance", "הכוונה כללית לחתונה"] };
  return labels[source]?.[language === "he" ? 1 : 0] ?? null;
}
