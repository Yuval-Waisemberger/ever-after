import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import TimelinePage from "@/app/(couple)/wedding/timeline/page";
const mocks = vi.hoisted(() => ({ date: "2026-11-11" as string | null, tasks: [
  { id: "after", title: "After task", due_date: "2026-11-18", status: "open" },
  { id: "same", title: "Same day task", due_date: "2026-11-11", status: "in_progress" },
  { id: "before", title: "Before task", due_date: "2026-11-01", status: "completed" },
  { id: "unscheduled", title: "Unscheduled task", due_date: null, status: "open" },
] }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: async () => ({ wedding_date: mocks.date }) }));
vi.mock("@/lib/queries/tasks", () => ({ getTasks: async () => mocks.tasks }));
afterEach(() => { vi.useRealTimers(); });
it("places pre/same-day tasks before Wedding Day, post-wedding tasks after it, without mutating records", async () => {
  const before = JSON.stringify(mocks.tasks);
  const html = renderToStaticMarkup(await TimelinePage());
  const path = new DOMParser().parseFromString(html, "text/html").querySelector(".planning-timeline-path")!.textContent!;
  const positions = ["Before task", "Same day task", "Your Wedding Day", "After task"].map(text => path.indexOf(text));
  expect(positions.every(position => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a,b) => a-b));
  expect(JSON.stringify(mocks.tasks)).toBe(before);
  expect(html).toContain("planning-timeline-path");
  expect(html).toContain("Add date");
});
it("preserves calendar grouping without a wedding date", async () => {
  mocks.date = null;
  try { expect(renderToStaticMarkup(await TimelinePage())).not.toContain("Your Wedding Day"); }
  finally { mocks.date = "2026-11-11"; }
});

it("selects the actual upcoming incomplete task, independently of input order, and removes destination art", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
  const html = renderToStaticMarkup(await TimelinePage());
  const doc = new DOMParser().parseFromString(html, "text/html");
  expect(doc.querySelector(".timeline-summary-next")?.textContent).toContain("Same day task");
  expect(doc.querySelectorAll('[data-next="true"]')).toHaveLength(1);
  expect(doc.querySelector('[data-next="true"]')?.textContent).toContain("Same day task");
  expect(doc.querySelector('[data-state="completed"] svg')).not.toBeNull();
  expect(doc.querySelector(".wedding-destination-art")).toBeNull();
  expect(doc.querySelector(".timeline-unscheduled")?.textContent).toContain("Unscheduled task");
});
it("does not label an overdue task as upcoming", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-12-01T12:00:00Z"));
  const html = renderToStaticMarkup(await TimelinePage());
  expect(html).toContain("No upcoming dated tasks");
  expect(html).not.toContain('data-next="true"');
});
