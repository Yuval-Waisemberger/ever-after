import { israelCalendarDate } from "./calendar";
const DAY_MS = 86_400_000;

function utcDate(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function calendarDayDifference(date: string, today = new Date()): number {
  return Math.round((utcDate(date).getTime() - utcDate(israelCalendarDate(today)).getTime()) / DAY_MS);
}

export function isPastCalendarDate(date: string | null, today = new Date()): boolean {
  return Boolean(date && calendarDayDifference(date, today) < 0);
}

export function deadlineLabel(dueDate: string, today = new Date()): {
  kind: "overdue" | "due_soon" | "future";
  label: string;
  days: number;
} {
  const days = calendarDayDifference(dueDate, today);
  if (days < 0) {
    const overdueDays = Math.abs(days);
    return {
      kind: "overdue",
      label: `Overdue ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`,
      days,
    };
  }
  if (days === 0) return { kind: "due_soon", label: "Due today", days };
  if (days < 7) {
    const weekday = new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" })
      .format(utcDate(dueDate));
    return { kind: "due_soon", label: `Due ${weekday}`, days };
  }
  if (days === 7) return { kind: "due_soon", label: "Due soon", days };
  return { kind: "future", label: "Scheduled", days };
}

export function formatCalendarDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(value));
}
