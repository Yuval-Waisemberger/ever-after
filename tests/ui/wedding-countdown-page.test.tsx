import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ headers: vi.fn(async () => new Headers({ host: "localhost:3000" })) }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/components/couple/couple-profile-menu", () => ({ CoupleProfileMenu: () => null }));
vi.mock("@/lib/queries/couple-identity", () => ({ getCoupleIdentity: async () => ({ avatarChoice: "initials", photoUrl: null }) }));
vi.mock("@/lib/queries/guests", () => ({ getGuestSummary: async () => ({ invitationParties: 0, invited: 0, attending: 0, awaitingResponse: 0, notAttending: 0, notYetInvited: 0 }) }));
vi.mock("@/lib/queries/wedding", () => ({ getWeddingDashboard: async () => ({
  wedding: { wedding_date: "2026-09-12", partner_one_name: "A", partner_two_name: "B", setup_status: "completed" },
  tasks: [], taskSummary: { open: 0, dueThisWeek: 0, completed: 0, total: 0, completion: 0 }, relationships: [], budgetItems: [],
  budget: { totalBudgetMinor: null, upcomingPayments: [] },
}) }));
import Page from "@/app/(couple)/wedding/page";
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.clearAllMocks(); });
const render = async (query: Record<string, string>) => {
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({}), searchParams: Promise.resolve(query) }));
  return new DOMParser().parseFromString(html, "text/html");
};
it("production ignores preview at the actual page boundary", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-07T12:00:00Z"));
  const doc = await render({ previewDaysBefore: "0" });
  expect(doc.querySelector(".wedding-date-card")?.getAttribute("data-phase")).toBe("FINAL_WEEK");
  expect(doc.body.textContent).not.toContain("Development preview"); expect(mocks.headers).not.toHaveBeenCalled();
});
it("development previews change only the date area and leave exactly six normal cards", async () => {
  vi.stubEnv("NODE_ENV", "development"); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-07T12:00:00Z"));
  const normal = await render({ previewDaysBefore: "8" }), day = await render({ previewDaysBefore: "0" });
  expect(day.querySelector(".wedding-date-card")?.getAttribute("data-phase")).toBe("WEDDING_DAY");
  expect(day.querySelector(".wedding-overview")?.innerHTML).toBe(normal.querySelector(".wedding-overview")?.innerHTML);
  expect([...day.querySelectorAll(".wedding-overview h2")].map(h => h.textContent)).toEqual(["Our Tasks", "Upcoming", "Our Vendors", "Budget", "Guest List", "Wedding Assistant"]);
  expect(day.body.textContent).not.toMatch(/Tasks needing attention|Payment deadlines|Your booked vendors|Guest confirmations|Details to check/);
});
