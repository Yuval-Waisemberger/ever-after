import { calendarDayDifference } from "./date-status";

export function daysUntilWedding(weddingDate: string | null, today = new Date()): number | null {
  if (!weddingDate) return null;
  return calendarDayDifference(weddingDate, today);
}

export function isWeddingWeek(weddingDate: string | null, today = new Date()): boolean {
  const days = daysUntilWedding(weddingDate, today);
  return days != null && days >= 0 && days <= 7;
}
