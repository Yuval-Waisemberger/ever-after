import { isPastCalendarDate } from "@/lib/domain/date-status";
import { isDueWithinDays } from "@/lib/domain/tasks";
import type { AssistantTask } from "./types";

// Small local compatibility intents, not semantic interpretation or a tool loop.
export function localTaskSubset(prompt: string): "waiting" | "overdue" | null {
  if (/payment|budget|guest|rsvp|attend|תשלו|תקציב|מוזמנ|אורח/i.test(prompt)) return null;
  if (/\bwaiting\b|\bwait on\b|מחכים|ממתינ|ממתין|בהמתנה/i.test(prompt)) return "waiting";
  if (/overdue|באיחור|עבר.*מועד/i.test(prompt)) return "overdue";
  return null;
}
export function localTaskSummary(tasks: AssistantTask[], language: "he" | "en", subset: "waiting" | "overdue" | null, now = new Date()): string {
  const open = tasks.filter(task => task.status !== "completed");
  const selected = open.filter(task => subset === "waiting" ? task.status === "waiting_on_vendor" : subset === "overdue" ? isPastCalendarDate(task.dueDate, now) : isDueWithinDays(task.dueDate, now, 7));
  const titles = selected.map(task => task.status === "waiting_on_vendor"
    ? language === "he" ? `מעקב מול הספק בנושא: ${task.title}` : `Follow up with the vendor about: ${task.title}`
    : task.title).join("; ");
  if (language === "he") {
    if (subset) return `${subset === "waiting" ? "משימות בהמתנה לספק" : "משימות באיחור"}: ${selected.length}.${titles ? `\n${titles}` : ""}`;
    return `יש לכם ${open.length} משימות פתוחות.\n${titles ? `בשבעת הימים הקרובים: ${titles}.` : "אין משימות מתוארכות לשבעת הימים הקרובים."}`;
  }
  if (subset) return `${selected.length} ${subset === "waiting" ? "tasks waiting on vendors" : "overdue tasks"}.${titles ? `\n${titles}` : ""}`;
  return `You have ${open.length} open ${open.length === 1 ? "task" : "tasks"}.${titles ? ` Due in the next seven days: ${titles}.` : " Nothing with a date is due in the next seven days."}`;
}
