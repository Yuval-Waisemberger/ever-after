import type { AssistantContext, AssistantResponse } from "./types";
import { assistantCopy } from "./language";
import { clarificationSchema } from "./planning/policy";
import { classifyUnpaidPayments } from "./payments";
import { localTaskSummary } from "./local-task-summary";
import { formatIls } from "@/lib/domain/budget";

// Five small demonstration intents; no semantic quote extraction or agent loop.
export function localPrompt(message: string) {
  const aliases: Array<[RegExp, string]> = [[/משימ|השבוע/, "task"], [/תקציב|תשלום|תשלומים|שילמנו/, "budget"], [/מוזמנ|אורחים|אישורי הגעה/, "guest list"], [/ספקים.*(?:סגרנו|סגורים|הזמנו)|מי.*סגור/, "booked"], [/מחיר טוב|מחיר סביר|יקר|תקציב.*(?:מספיק|ריאלי)|מחירי שוק|נהלים|דרישות.*(?:רישום|חתונה)/, "reasonable"]];
  return `${message.toLowerCase()} ${aliases.filter(([pattern]) => pattern.test(message)).map(([, token]) => token).join(" ")}`;
}
export function researchClarification(message: string, context: AssistantContext) {
  if (!/צלם|צילום|photograph/i.test(message)) return undefined;
  return clarificationSchema.parse({ required: true, missingFields: [
    { field: "coverageHours", questionIntent: "define_package", reason: "package_comparability" },
    { field: "videoIncluded", questionIntent: "define_package", reason: "package_comparability" },
    ...(!context.wedding.preferredArea || context.wedding.preferredArea === "flexible" ? [{ field: "region", questionIntent: "locate_event", reason: "regional_comparability" }] : []),
  ] });
}
export function hebrewLocalSummary(prompt: string, context: AssistantContext): AssistantResponse {
  const answer = (text: string, section?: "tasks" | "budget" | "guestList" | "vendors"): AssistantResponse => ({ status: "ok", text, language: "he", evidence: section ? [{ kind: "COUPLE_DATA", section }] : [{ kind: "AI_RECOMMENDATION" }] });
  if (/guest list|guest count|rsvp|attend|not invited|already invited/.test(prompt)) {
    const g = context.guestList;
    return answer(`ברשימת המוזמנים שלכם: ${g.invited} הוזמנו, ${g.attending} אישרו הגעה, ${g.awaitingResponse} עדיין לא השיבו, ${g.notAttending} לא יגיעו ו־${g.notYetInvited} טרם הוזמנו.`, "guestList");
  }
  if (/budget|left|available|paid|payment|overdue/.test(prompt) && !/\btasks?\b/.test(prompt)) {
    const b = context.budget, p = classifyUnpaidPayments(b.unpaidPayments);
    const summary = b.availableMinor == null ? "התקציב הכולל שלכם עדיין לא הוגדר." : `נותרו ${formatIls(b.availableMinor)} מתוך התקציב לאחר התחייבויות והוצאות ששולמו. ההתחייבויות הפעילות הן בסך ${formatIls(b.committedMinor)}. סומנו כשולמו ${formatIls(b.paidMinor)}.`;
    return answer(`${summary}\n${p.overdue.length ? `${p.overdue.length} תשלומים שלא שולמו נמצאים באיחור.` : "אין תשלומים מתוארכים באיחור."}\n${p.upcoming[0] ? `התשלום הקרוב: ${formatIls(p.upcoming[0].amountMinor)} בתאריך ${p.upcoming[0].dueDate}.` : "לא רשום תשלום עתידי עם תאריך יעד."}${p.undated.length ? `\nל־${p.undated.length} תשלומים פתוחים לא הוגדר תאריך יעד.` : ""}`, "budget");
  }
  if (/this week|due|task|still need|to do/.test(prompt)) {
    return answer(localTaskSummary(context.tasks, "he", null), "tasks");
  }
  if (/booked|which vendors|our vendors/.test(prompt) && !/compare/.test(prompt)) {
    const booked = context.vendors.filter((v) => v.lifecycleStatus === "booked");
    const response = answer(booked.length ? `${booked.length} ספקים מסומנים כסגורים: ${booked.map((v) => v.businessName).join(", ")}.` : "עדיין אין ספק שמסומן כסגור.", "vendors");
    const ids = booked.filter((v) => v.source === "marketplace").map((v) => v.id);
    if (ids.length) response.evidence.push({ kind: "MARKETPLACE_DATA", vendorIds: ids });
    return response;
  }
  return answer(`${assistantCopy.he.redirect}\nהעוזר המקומי יכול כרגע להציג סיכומים פשוטים של הנתונים. שיחה חופשית וניתוח מתקדם יהיו זמינים לאחר חיבור ספק בינה מלאכותית.`);
}
