import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WeddingDateCountdown } from "@/components/wedding/wedding-date-countdown";
import { getWeddingDatePreview } from "@/lib/domain/wedding-date-preview";
const now = Date.parse("2026-09-07T12:00:00Z");
const render = (date: string | null, previewNow: number | null = null) => renderToStaticMarkup(<WeddingDateCountdown weddingDate={date} initialNow={now} previewNow={previewNow} />);
it("retains the normal date area outside the final week and when no date exists", () => {
  const html = render("2026-09-15");
  expect(html).toContain("8 days until your celebration"); expect(html).not.toContain("Wedding Week");
  expect(render(null)).toContain("Wedding date not set yet"); expect(render(null)).not.toContain("days to go");
});
it.each([["2026-09-14", "7 days to go"], ["2026-09-10", "3 days to go"], ["2026-09-08", "Tomorrow"], ["2026-09-07", "Today is the day"], ["2026-09-06", "Just married"]])("renders %s inside a single date area", (date, label) => {
  const html = render(date); expect(new DOMParser().parseFromString(html, "text/html").body.textContent).toContain(label);
  expect(html).not.toMatch(/-\d+ days|ceremony|Tasks needing attention|Payment deadlines|Your booked vendors|Guest confirmations|Details to check/);
  const doc = new DOMParser().parseFromString(html, "text/html");
  expect(doc.querySelectorAll(".wedding-date-card")).toHaveLength(1);
  expect(doc.querySelectorAll("button, form")).toHaveLength(0);
  if (date <= "2026-09-07") expect(html).not.toContain("until your wedding day");
});
it("shows an explicit local preview indicator and accurate fine countdown", () => {
  const preview = getWeddingDatePreview("2027-06-12", { previewDaysBefore: "1" }, "development", "localhost:3000");
  expect(render("2027-06-12", preview)).toContain("Development preview");
  expect(render("2027-06-12", preview)).toContain("12h 00m");
  expect(render("2026-09-08")).not.toContain("Development preview");
});
