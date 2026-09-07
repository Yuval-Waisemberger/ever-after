import { startOfIsraelDay } from "./wedding-week";

// Presentation-only clock. The caller must never use it for queries or normal card totals.
export function getWeddingDatePreview(weddingDate: string | null, params: Record<string, string | string[] | undefined>, environment: string, host: string): number | null {
  if (environment !== "development" || !weddingDate || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) return null;
  const before = params.previewDaysBefore, after = params.previewDaysAfter;
  if (before !== undefined && after !== undefined) return null;
  const days = typeof before === "string" && ["8", "7", "3", "1", "0"].includes(before) ? Number(before)
    : after === "1" ? -1 : null;
  if (days == null) return null;
  const calendar = new Date(`${weddingDate}T00:00:00Z`);
  calendar.setUTCDate(calendar.getUTCDate() - days);
  // A reproducible midday preview anchored to the actual stored wedding date.
  return startOfIsraelDay(calendar.toISOString().slice(0, 10)) + 12 * 60 * 60_000;
}
