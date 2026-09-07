import { calendarDayDifference } from "./date-status";
import { z } from "zod";

// One Israel-calendar boundary for the Dashboard and planning consumers.
export function getWeddingPhase(weddingDate: string | null, today = new Date()) {
  z.iso.date().nullable().parse(weddingDate);
  const days = weddingDate == null ? null : calendarDayDifference(weddingDate, today);
  const key = days == null ? "NO_DATE" : days < 0 ? "POST_WEDDING" : days === 0 ? "WEDDING_DAY" : days === 1 ? "DAY_BEFORE" : days <= 7 ? "FINAL_WEEK" : "NORMAL";
  return { key, daysRemaining: days == null ? null : Math.max(0, days), daysSinceWedding: days == null ? null : Math.max(0, -days) } as const;
}

// Israel changes DST after midnight. Resolve that date's local midnight using Intl,
// rather than assuming a fixed UTC+2/+3 offset or inventing a ceremony time.
export function startOfIsraelDay(date: string): number {
  z.iso.date().parse(date);
  const midnight = Date.parse(`${date}T00:00:00Z`);
  let instant = midnight;
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(p => [p.type, p.value]));
    const localWallTime = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    instant += midnight - localWallTime;
  }
  return instant;
}

export function weddingDayCountdown(date: string, now: Date) {
  const minutes = Math.max(0, Math.ceil((startOfIsraelDay(date) - now.getTime()) / 60_000));
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}
