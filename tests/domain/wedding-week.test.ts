import { expect, it } from "vitest";
import { getWeddingPhase, startOfIsraelDay, weddingDayCountdown } from "@/lib/domain/wedding-week";
import { getWeddingDatePreview } from "@/lib/domain/wedding-date-preview";
import { weddingPhase } from "@/lib/assistant/planning/roadmap";
import { israelCalendarDate } from "@/lib/domain/calendar";
const now = new Date("2026-09-07T12:00:00Z");
it.each([
  [null, "NO_DATE", null, "unknown_date"], ["2026-09-15", "NORMAL", 8, "final_month"],
  ["2026-09-14", "FINAL_WEEK", 7, "wedding_week"], ["2026-09-10", "FINAL_WEEK", 3, "wedding_week"],
  ["2026-09-08", "DAY_BEFORE", 1, "wedding_week"], ["2026-09-07", "WEDDING_DAY", 0, "wedding_day"],
  ["2026-09-06", "POST_WEDDING", 0, "post_wedding"],
] as const)("phase %s remains shared with roadmap", (date, key, remaining, roadmapKey) => {
  expect(getWeddingPhase(date, now)).toMatchObject({ key, daysRemaining: remaining });
  expect(weddingPhase(date, now)).toMatchObject({ key: roadmapKey, daysRemaining: remaining });
});
it.each(["2026-09-08", "2026-01-08", "2026-03-27", "2026-10-25"])("resolves Israel midnight including DST transition dates: %s", date => {
  const start = startOfIsraelDay(date);
  expect(israelCalendarDate(new Date(start))).toBe(date);
  expect(israelCalendarDate(new Date(start - 1))).not.toBe(date);
  expect(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start)).toBe("00:00");
  expect(getWeddingPhase(date, new Date(start - 1)).key).toBe("DAY_BEFORE");
  expect(getWeddingPhase(date, new Date(start)).key).toBe("WEDDING_DAY");
  expect(weddingDayCountdown(date, new Date(start - 8 * 3600000 - 24 * 60000))).toEqual({ hours: 8, minutes: 24 });
  expect(weddingDayCountdown(date, new Date(start + 3600000))).toEqual({ hours: 0, minutes: 0 });
});
it("does not hard-code the summer/winter offset or invent a ceremony time", () => {
  expect(startOfIsraelDay("2026-09-08")).toBe(Date.parse("2026-09-07T21:00:00Z"));
  expect(startOfIsraelDay("2026-01-08")).toBe(Date.parse("2026-01-07T22:00:00Z"));
  expect(() => getWeddingPhase("2026-02-30", now)).toThrow();
});
it.each([8,7,3,1,0,-1])("preview anchors to stored date without mutating it: %s", days => {
  const date = "2027-06-12";
  const params = days < 0 ? { previewDaysAfter: "1" } : { previewDaysBefore: String(days) };
  const preview = getWeddingDatePreview(date, params, "development", "localhost:3000");
  expect(preview).not.toBeNull();
  expect(getWeddingPhase(date, new Date(preview!)).daysRemaining).toBe(Math.max(0,days));
  if (days < 0) expect(getWeddingPhase(date, new Date(preview!)).key).toBe("POST_WEDDING");
  expect(date).toBe("2027-06-12");
});
it("production/test/non-local hosts ignore previews", () => {
  for (const env of ["production", "test"]) expect(getWeddingDatePreview("2026-09-12", { previewDaysBefore: "0" }, env, "localhost:3000")).toBeNull();
  for (const host of ["example.com", "localhost.evil.com", "localhost:3000@evil.com", ""]) expect(getWeddingDatePreview("2026-09-12", { previewDaysBefore: "0" }, "development", host)).toBeNull();
});
it("rejects ambiguous/invalid previews and previews without an anchor", () => {
  for (const params of [{ previewDaysBefore: "-1" }, { previewDaysBefore: "3", previewDaysAfter: "1" }, { previewDaysBefore: ["3"] }, { previewDaysBefore: "03" }, { previewDaysAfter: "2" }]) expect(getWeddingDatePreview("2026-09-12", params, "development", "localhost")).toBeNull();
  expect(getWeddingDatePreview(null, { previewDaysBefore: "0" }, "development", "localhost")).toBeNull();
});
