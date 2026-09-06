import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalWeddingAssistantProvider } from "@/lib/assistant/local-provider";
import { classifyUnpaidPayments } from "@/lib/assistant/payments";
import { assistantContext, assistantVendor } from "./fixtures";

const provider = new LocalWeddingAssistantProvider();
afterEach(() => vi.useRealTimers());

describe("local assistant provider", () => {
  it("answers account questions from Couple data", async () => {
    const response = await provider.respond({ message: "What tasks do we still need to do?", context: assistantContext() });
    expect(response.text).toContain("1 open task");
    expect(response.evidence).toEqual([{ kind: "COUPLE_DATA", section: "tasks" }]);
  });
  it.each(["What are the current legal requirements?", "Is ₪170K a realistic budget for our wedding?", "Is ₪2,000 a good photographer price?"])("does not fabricate market research: %s", async (message) => {
    const response = await provider.respond({ message, context: assistantContext() });
    expect(response.text).toContain("Web research is not configured");
    expect(response.status).toBe("unavailable");
    expect(response.evidence).toEqual([]);
  });
  it.each(["What tasks are due today?", "What is our current budget?", "What payment is due today?"])("keeps application questions local: %s", async (message) => {
    const response = await provider.respond({ message, context: assistantContext() });
    expect(response.status).toBe("ok");
    expect(response.evidence[0].kind).toBe("COUPLE_DATA");
    expect(response.text).not.toContain("Web research");
  });
  it("uses privacy-preserving Guest List aggregates", async () => {
    const response = await provider.respond({ message: "How are our guest RSVPs looking?", context: assistantContext() });
    expect(response.text).toContain("8 invited");
    expect(response.text).toContain("3 attending");
    expect(response.evidence).toEqual([{ kind: "COUPLE_DATA", section: "guestList" }]);
  });
  it("keeps general invitation guidance separate from Guest List totals", async () => {
    const response = await provider.respond({ message: "What invitation wording should we include?", context: assistantContext() });
    expect(response.text).toContain("couple’s names");
    expect(response.text).not.toContain("8 invited");
    expect(response.evidence).toEqual([{ kind: "AI_RECOMMENDATION" }]);
  });
  it("uses independent Saved and lifecycle state and distinguishes external vendors from Marketplace facts", async () => {
    const context = assistantContext();
    context.vendors = [
      assistantVendor({ id: "one", businessName: "Saved Studio", isSaved: true }),
      assistantVendor({ id: "two", businessName: "Considering Studio", lifecycleStatus: "considering" }),
      assistantVendor({ id: "three", businessName: "External Quartet", source: "external", lifecycleStatus: "booked" }),
    ];
    const comparison = await provider.respond({ message: "Compare the vendors", context });
    expect(comparison.text).toContain("Saved Studio");
    expect(comparison.text).toContain("Considering Studio");
    expect(comparison.evidence).toContainEqual({ kind: "MARKETPLACE_DATA", vendorIds: ["one", "two"] });
    expect(comparison.evidence).toContainEqual({ kind: "AI_RECOMMENDATION" });
    expect(comparison.text).not.toContain("private notes");
    const booked = await provider.respond({ message: "Which vendors are booked?", context });
    expect(booked.text).toContain("External Quartet");
    expect(booked.evidence).toEqual([{ kind: "COUPLE_DATA", section: "vendors" }]);
  });
  it("keeps missing wedding details and budget unknown", async () => {
    const context = assistantContext();
    context.budget.availableMinor = null;
    const result = await provider.respond({ message: "How much budget is left?", context });
    expect(result.text).toContain("total budget is not set");
    expect(result.text).not.toContain("available after");
  });
});

describe("deterministic payment dates", () => {
  const now = new Date("2026-09-07T09:00:00Z");
  const overdue = { amountMinor: 10000, dueDate: "2026-09-06" };
  const upcoming = { amountMinor: 20000, dueDate: "2026-09-08" };
  const undated = { amountMinor: 30000, dueDate: null };
  it.each([
    { name: "overdue only", payments: [overdue], counts: [1, 0, 0] },
    { name: "upcoming only", payments: [upcoming], counts: [0, 1, 0] },
    { name: "both", payments: [upcoming, overdue], counts: [1, 1, 0] },
    { name: "no unpaid", payments: [], counts: [0, 0, 0] },
    { name: "undated", payments: [undated], counts: [0, 0, 1] },
  ])("classifies $name", ({ payments, counts }) => {
    const result = classifyUnpaidPayments(payments, now);
    expect([result.overdue.length, result.upcoming.length, result.undated.length]).toEqual(counts);
  });
  it("uses the Israel calendar at a UTC midnight boundary and treats today as upcoming", () => {
    const result = classifyUnpaidPayments([overdue, { ...upcoming, dueDate: "2026-09-07" }], new Date("2026-09-06T22:00:00Z"));
    expect(result.overdue).toEqual([overdue]);
    expect(result.upcoming[0].dueDate).toBe("2026-09-07");
  });
  it("orders upcoming payments and never presents overdue as next", async () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const context = assistantContext();
    context.budget.unpaidPayments = [upcoming, overdue, undated];
    const response = await provider.respond({ message: "What payment is due next?", context });
    expect(response.text).toContain("1 overdue unpaid payment");
    expect(response.text).toContain("next upcoming payment");
    expect(response.text).toContain("2026-09-08");
    expect(response.text).not.toContain("on 2026-09-06");
    expect(response.text).toContain("no due date set");
    context.budget.unpaidPayments = [overdue];
    const overdueOnly = await provider.respond({ message: "What is the next payment?", context });
    expect(overdueOnly.text).not.toContain("Your next upcoming payment");
    expect(overdueOnly.text).toContain("no upcoming dated payment");
  });
});
