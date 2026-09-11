import { beforeEach, describe, expect, it, vi } from "vitest";
import { assistantContext } from "./fixtures";

const mocks = vi.hoisted(() => ({ from: vi.fn(), wedding: vi.fn(), tasks: vi.fn(), guests: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.wedding }));
vi.mock("@/lib/queries/tasks", () => ({ getTasks: mocks.tasks }));
vi.mock("@/lib/queries/guests", () => ({ getGuestSummary: mocks.guests }));
import { getAssistantContext, getLatestAssistantThread } from "@/lib/queries/assistant";
import { AssistantContextUnavailableError } from "@/lib/assistant/context-error";

type QueryResult = { data: unknown; error: unknown };
const results = new Map<string, QueryResult>();
const queries: Array<{ table: string; select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> }> = [];
function query(table: string) {
  const promise = Promise.resolve(results.get(table) ?? { data: [], error: null });
  const chain = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    maybeSingle: () => promise, then: promise.then.bind(promise),
  };
  queries.push({ table, select: chain.select, eq: chain.eq });
  return chain;
}
beforeEach(() => {
  vi.clearAllMocks(); results.clear(); queries.length = 0;
  mocks.wedding.mockResolvedValue({ id: "owned-wedding", wedding_date: null, guest_count: 250, preferred_area: "central_israel", event_type: null, styles: [], priorities: [], total_budget_minor: 18000000, setup_status: "completed" });
  mocks.tasks.mockResolvedValue([]); mocks.guests.mockResolvedValue(assistantContext().guestList);
  mocks.from.mockImplementation(query);
});

describe("Assistant context queries", () => {
  it("keeps paid spending after unbooking and excludes inactive unpaid schedules", async () => {
    results.set("budget_items", { error: null, data: [{ source: "booked_vendor", couple_vendors: { status: "rejected" }, estimated_amount_minor: 100000, committed_amount_minor: null, payments: [
      { amount_minor: 20000, is_paid: true, due_date: null },
      { amount_minor: 80000, is_paid: false, due_date: "2027-01-01" },
    ] }] });
    expect((await getAssistantContext()).budget).toEqual({ committedMinor: 0, paidMinor: 20000, availableMinor: 17980000, unpaidPayments: [] });
  });
  it.each([["couple_vendors", "vendors"], ["budget_items", "budget"]])("fails closed when %s returns an error even with data", async (table, section) => {
    results.set(table, { data: [], error: { message: "private database failure" } });
    await expect(getAssistantContext()).rejects.toMatchObject({ name: "AssistantContextUnavailableError", section });
  });
  it.each(["couple_vendors", "budget_items"])("does not treat a null %s result as empty", async (table) => {
    results.set(table, { data: null, error: null });
    await expect(getAssistantContext()).rejects.toBeInstanceOf(AssistantContextUnavailableError);
  });
  it("wraps rejected database requests without leaking the cause", async () => {
    mocks.from.mockImplementation((table) => { if (table === "budget_items") throw new Error("secret"); return query(table); });
    await expect(getAssistantContext()).rejects.toMatchObject({ section: "budget", message: "Assistant context unavailable: budget" });
  });
  it.each(["tasks", "guests", "wedding"] as const)("preserves existing %s read failure semantics", async (source) => {
    mocks[source].mockRejectedValue(new Error("private"));
    await expect(getAssistantContext()).rejects.toBeInstanceOf(AssistantContextUnavailableError);
  });
  it("treats successful empty results as actual empty records and scopes reads to the owned wedding", async () => {
    const context = await getAssistantContext();
    expect(context.vendors).toEqual([]); expect(context.budget.committedMinor).toBe(0);
    for (const call of queries) expect(call.eq).toHaveBeenCalledWith("wedding_id", "owned-wedding");
  });
  it("excludes paid records from unpaid deadlines and uses deterministic budget totals", async () => {
    results.set("budget_items", { error: null, data: [{ estimated_amount_minor: 99999, committed_amount_minor: 60000, payments: [
      { amount_minor: 10000, is_paid: true, due_date: "2026-01-01" },
      { amount_minor: 20000, is_paid: false, due_date: "2026-09-08" },
      { amount_minor: 30000, is_paid: false, due_date: null },
    ] }] });
    const context = await getAssistantContext();
    expect(context.budget).toEqual({ committedMinor: 60000, paidMinor: 10000, availableMinor: 17940000, unpaidPayments: [{ amountMinor: 20000, dueDate: "2026-09-08" }, { amountMinor: 30000, dueDate: null }] });
  });
  it("does not hide unavailable payment relations", async () => {
    results.set("budget_items", { error: null, data: [{ committed_amount_minor: 1, payments: null }] });
    await expect(getAssistantContext()).rejects.toMatchObject({ section: "budget" });
  });
  it("does not turn an unreadable vendor relationship into no bookings", async () => {
    results.set("couple_vendors", { error: null, data: [{ status: "booked", vendor_profiles: null, external_vendors: null }] });
    await expect(getAssistantContext()).rejects.toMatchObject({ section: "vendors" });
  });
  it("does not select vendor contacts/notes or leak extra returned fields", async () => {
    results.set("couple_vendors", { error: null, data: [{ status: "booked", is_saved: true, agreed_price_minor: 12000, private_notes: "private", vendor_profiles: null, external_vendors: { id: "external-1", business_name: "Original Business Name", phone: "private", notes: "private" } }] });
    const context = await getAssistantContext();
    expect(context.vendors[0].businessName).toBe("Original Business Name");
    expect(context.vendors[0].source).toBe("external");
    expect(JSON.stringify(context)).not.toContain("private");
    const selection = queries.find((item) => item.table === "couple_vendors")!.select.mock.calls[0][0];
    expect(selection).not.toMatch(/phone|email|notes|website|instagram/);
    expect(Object.keys(context.guestList).sort()).toEqual(["attending", "awaitingResponse", "invited", "notAttending", "notYetInvited"].sort());
  });
  it("carries Marketplace category pricing semantics into the local Assistant context", async () => {
    results.set("couple_vendors", { error: null, data: [{
      status: "considering", is_saved: true, agreed_price_minor: null, external_vendors: null,
      vendor_profiles: {
        id: "venue", business_name: "Venue", location_mode: "fixed", physical_area: "central_israel", service_areas: [],
        min_price_minor: 30_000, max_price_minor: 50_000, services: [], styles: [], event_types: [],
        min_guest_capacity: 1, max_guest_capacity: 5000, vendor_categories: { slug: "venues" }, reviews: [],
      },
    }] });

    const context = await getAssistantContext();

    expect(context.vendors[0].categorySlug).toBe("venues");
    const selection = queries.find((item) => item.table === "couple_vendors")!.select.mock.calls[0][0];
    expect(selection).toContain("vendor_categories(slug)");
  });
});

describe("Assistant history read errors", () => {
  it("distinguishes no conversation from a failed lookup", async () => {
    results.set("assistant_threads", { data: null, error: null });
    expect(await getLatestAssistantThread()).toEqual({ thread: null, messages: [] });
    results.set("assistant_threads", { data: null, error: { message: "private" } });
    await expect(getLatestAssistantThread()).rejects.toThrow("conversation could not be loaded");
  });
  it("does not hide message read failures as an empty conversation", async () => {
    results.set("assistant_threads", { data: { id: "thread" }, error: null });
    results.set("assistant_messages", { data: null, error: { message: "private" } });
    await expect(getLatestAssistantThread()).rejects.toThrow("messages could not be loaded");
  });
});
