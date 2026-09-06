import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { database, expense, otherOwner, otherWedding, owner, payment, relation, review, task, uuid, vendor, vendorId, vendorTwo, weddingId } from "./database-double";
import * as c from "@/lib/assistant/tools/contracts";
import * as scoring from "@/lib/domain/recommendation";

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
import { assistantReadTools, assistantReadToolDefinitions, executeAssistantReadTool } from "@/lib/assistant/tools/registry";
const names = ["get_wedding_summary", "list_tasks", "get_timeline_summary", "get_budget_summary", "get_upcoming_payments", "get_couple_vendors", "search_marketplace_vendors", "compare_vendors", "get_guest_list_summary", "get_missing_wedding_details"] as const;
let db: ReturnType<typeof database>;
const inputFor = (name: string) => name === "compare_vendors" ? { vendorIds: [vendorId, vendorTwo] } : {};
async function data<S extends z.ZodType>(name: string, schema: S, input: unknown = {}): Promise<z.output<S>> {
  const result = c.resultSchema(schema).parse(await executeAssistantReadTool(name, input));
  if (result.status === "unavailable") throw new Error(c.unavailableSchema.parse(result).error.code);
  return schema.parse("data" in result ? result.data : undefined);
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-07T09:00:00Z"));
  db = database(); mocks.client.mockResolvedValue(db.client);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("registry and authorization", () => {
  it("registers exactly the ten allowlisted read tools with input/output schemas", () => {
    expect(Object.keys(assistantReadTools)).toEqual(names);
    for (const tool of assistantReadToolDefinitions) {
      expect(tool.readOnly).toBe(true); expect(tool.inputSchema).toBeDefined(); expect(tool.outputSchema).toBeDefined();
      expect(tool.name).not.toMatch(/^(create|update|complete|save|unsave|book|mark|research)_|benchmark/);
    }
  });
  it.each(names)("rejects unauthenticated calls to %s", async (name) => {
    db.state.userId = null;
    const result = await executeAssistantReadTool(name, inputFor(name));
    expect(result).toMatchObject({ status: "unavailable", error: { code: "NOT_AUTHORIZED" }, evidence: [] });
    expect(result).not.toHaveProperty("data"); expect(db.state.calls).toHaveLength(0);
  });
  it.each(names)("rejects Vendor-role calls to %s", async (name) => {
    db.state.tables.profiles[0].role = "vendor";
    expect(await executeAssistantReadTool(name, inputFor(name))).toMatchObject({ status: "unavailable", error: { code: "NOT_AUTHORIZED" } });
    expect(db.state.calls.map((call) => call.table)).toEqual(["profiles"]);
  });
  it.each(names)("resolves only the owned wedding for %s", async (name) => {
    const result = await executeAssistantReadTool(name, inputFor(name));
    expect(result.status).not.toBe("unavailable");
    expect(db.state.authCalls).toBe(1);
    expect(db.state.calls.find((call) => call.table === "weddings")?.operations).toContainEqual(["eq", "owner_user_id", owner]);
    expect(JSON.stringify(result)).not.toContain("OTHER_COUPLE_SENTINEL");
    for (const call of db.state.calls.filter((call) => ["tasks", "budget_items", "guests", "couple_vendors", "external_vendors"].includes(call.table))) expect(call.operations).toContainEqual(["eq", "wedding_id", weddingId]);
    for (const call of db.state.calls.filter((call) => call.table === "payments")) expect(call.operations).toContainEqual(["eq", "budget_items.wedding_id", weddingId]);
  });
  it("re-authenticates rather than retaining the first Couple context", async () => {
    await executeAssistantReadTool("get_wedding_summary");
    db.state.userId = otherOwner;
    const second = await data("get_wedding_summary", c.weddingData);
    expect(second.venueName).toBe("OTHER_COUPLE_SENTINEL"); expect(db.state.authCalls).toBe(2);
  });
  it("fails closed on auth errors, missing owned wedding and failed role lookup", async () => {
    db.state.authError = true;
    expect(await executeAssistantReadTool("get_wedding_summary")).toMatchObject({ status: "unavailable" });
    db.state.authError = false; db.state.tables.weddings = [];
    expect(await executeAssistantReadTool("get_wedding_summary")).toMatchObject({ error: { code: "NOT_AUTHORIZED" } });
    db.state.errors.add("profiles");
    expect(await executeAssistantReadTool("get_wedding_summary")).toMatchObject({ error: { code: "SOURCE_UNAVAILABLE" } });
  });
  it.each(names)("rejects a caller-supplied wedding ID for %s", async (name) => {
    expect(await executeAssistantReadTool(name, { ...inputFor(name), wedding_id: otherWedding })).toMatchObject({ status: "unavailable", error: { code: "INVALID_INPUT" } });
    expect(db.state.authCalls).toBe(0);
  });
  it.each(["create_task", "book_vendor", "mark_payment_paid", "get_market_benchmark", "research_current_wedding_info", "__proto__", "constructor"])("rejects unregistered tool %s", async (name) => {
    expect(await executeAssistantReadTool(name)).toMatchObject({ error: { code: "UNKNOWN_TOOL" } }); expect(db.state.authCalls).toBe(0);
  });
  it("contains no write/SQL/provider dispatcher in the tool layer", () => {
    for (const file of readdirSync("src/lib/assistant/tools")) {
      const source = readFileSync(`src/lib/assistant/tools/${file}`, "utf8");
      expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(|\bfetch\(|@\/lib\/actions|select\(["']\*/);
    }
  });
});

describe("wedding and missing details", () => {
  it("returns only existing planning fields without contacts or account metadata", async () => {
    const result = await data("get_wedding_summary", c.weddingData);
    expect(result.venueName).toBe("Our Venue"); expect(result.bookedCategories).toEqual(["Venue"]);
    expect(result).not.toHaveProperty("id"); expect(result).not.toHaveProperty("owner_user_id");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    expect(db.state.calls.filter((call) => call.table === "weddings").every((call) => !call.selection?.includes("*"))).toBe(true);
  });
  it("identifies actual missing facts and retains optional budget zero as known", async () => {
    Object.assign(db.state.tables.weddings[0], { wedding_date: null, guest_count: null, preferred_area: null, event_type: "undecided", styles: [], priorities: [], total_budget_minor: 0, venue_status: null, venue_name: null, setup_status: "skipped" });
    const result = await data("get_missing_wedding_details", c.missingData);
    expect(result.fields.map((field) => field.field)).toEqual(["weddingDate", "guestCount", "preferredArea", "eventType", "styles", "priorities", "venueStatus"]);
    expect(result.fields[0].limits).toContain("timeline_advice"); expect(result.setupComplete).toBe(false);
    expect(result.fields).not.toContainEqual(expect.objectContaining({ field: "totalBudgetMinor" }));
  });
  it("returns EMPTY when no relevant details are missing", async () => {
    expect(await executeAssistantReadTool("get_missing_wedding_details")).toMatchObject({ status: "empty", data: { fields: [], setupComplete: true } });
  });
  it("does not treat an intentionally unbooked venue as an unknown status", async () => {
    Object.assign(db.state.tables.weddings[0], { venue_status: "not_yet", venue_name: null });
    expect((await data("get_missing_wedding_details", c.missingData)).fields).toEqual([]);
    Object.assign(db.state.tables.weddings[0], { venue_status: "booked", venue_name: null });
    expect((await data("get_missing_wedding_details", c.missingData)).fields.map((item) => item.field)).toEqual(["venueName"]);
  });
});

describe("tasks and timeline", () => {
  beforeEach(() => {
    db.state.tables.tasks = [task(400, { due_date: "2026-09-06", priority: "high" }), task(401, { due_date: "2026-09-07", status: "in_progress" }), task(402, { due_date: "2026-09-14" }), task(403, { due_date: "2026-09-15" }), task(404, { due_date: null }), task(405, { due_date: "2026-09-01", status: "completed" }), task(406, { wedding_id: otherWedding, title: "OTHER_COUPLE_SENTINEL" }), task(407, { due_date: "2026-11-01" })];
  });
  it.each([
    ["overdue", [uuid(400)]], ["due_soon", [uuid(401), uuid(402)]], ["completed", [uuid(405)]],
  ])("filters %s deterministically", async (view, expected) => {
    const result = await data("list_tasks", c.taskData, { view });
    expect(result.tasks.map((task) => task.id)).toEqual(expected);
  });
  it("supports exact status/priority and does not expose notes", async () => {
    const result = await data("list_tasks", c.taskData, { status: "open", priority: "high" });
    expect(result.tasks.map((task) => task.id)).toEqual([uuid(400)]); expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    expect((await data("list_tasks", c.taskData, { status: "completed" })).tasks.map((task) => task.id)).toEqual([uuid(405)]);
    expect((await data("list_tasks", c.taskData, { view: "open" })).tasks.every((task) => task.status !== "completed")).toBe(true);
  });
  it("enforces default/max bounds and deterministic page continuation", async () => {
    db.state.tables.tasks = Array.from({ length: 60 }, (_, index) => task(500 + index));
    expect((await data("list_tasks", c.taskData)).tasks).toHaveLength(25);
    const result = await data("list_tasks", c.taskData, { limit: 50 });
    expect(result.tasks).toHaveLength(50); expect(result.pagination.hasMore).toBe(true);
    expect((await data("list_tasks", c.taskData, { limit: 50, page: 2 })).tasks).toHaveLength(10);
    expect(await executeAssistantReadTool("list_tasks", { limit: 51 })).toMatchObject({ error: { code: "INVALID_INPUT" } });
  });
  it("derives timeline groups and relative timing from dated Tasks only", async () => {
    const result = await data("get_timeline_summary", c.timelineData, { includeCompleted: true });
    expect(result.groups.map((group) => group.key)).toEqual(["overdue", "due_soon", "upcoming", "later", "completed"]);
    const tasks = result.groups.flatMap((group) => group.tasks);
    expect(tasks).toHaveLength(6); expect(new Set(tasks.map((task) => task.id)).size).toBe(6);
    expect(tasks.every((task) => task.relativeTiming !== null)).toBe(true);
    expect(db.state.calls.map((call) => call.table)).not.toContain("timeline");
  });
  it("keeps missing wedding-date timing null and excludes completed by default", async () => {
    db.state.tables.weddings[0].wedding_date = null;
    const result = await data("get_timeline_summary", c.timelineData);
    expect(result.groups.flatMap((group) => group.tasks).every((task) => task.relativeTiming === null && task.status !== "completed")).toBe(true);
  });
  it("uses Israel calendar dates across a UTC midnight boundary", async () => {
    vi.setSystemTime(new Date("2026-09-06T22:30:00Z"));
    const result = await data("list_tasks", c.taskData, { view: "overdue" });
    expect(result.asOfDate).toBe("2026-09-07"); expect(result.tasks.map((task) => task.id)).toEqual([uuid(400)]);
  });
});

describe("budget and payment reads", () => {
  beforeEach(() => {
    db.state.tables.budget_items = [expense(300), expense(301, { wedding_id: otherWedding })];
    db.state.tables.payments = [payment(600, { is_paid: true }), payment(601, { due_date: "2026-09-06" }), payment(602), payment(603, { due_date: null }), payment(604, { budget_item_id: uuid(301), label: "OTHER_COUPLE_SENTINEL" })];
  });
  it("uses complete deterministic owned totals and no financial notes", async () => {
    const result = await data("get_budget_summary", c.budgetData);
    expect(result).toEqual({ totalBudgetMinor: 18000000, projectedMinor: 1000000, committedMinor: 1000000, paidMinor: 200000, availableMinor: 17000000, remainingCommittedMinor: 800000 });
    expect(JSON.stringify(result)).not.toMatch(/SENTINEL|notes/);
  });
  it("reads every aggregate batch rather than returning a truncated budget", async () => {
    db.state.tables.budget_items = [expense(300, { committed_amount_minor: 1000000 })];
    db.state.tables.payments = Array.from({ length: 501 }, (_, i) => payment(1000 + i, { is_paid: true, amount_minor: 100 }));
    expect((await data("get_budget_summary", c.budgetData)).paidMinor).toBe(50100);
    expect(db.state.calls.filter((call) => call.table === "payments").map((call) => call.operations.find((op) => op[0] === "range"))).toEqual([["range", 0, 499], ["range", 500, 999]]);
  });
  it("retains unknown budget and distinguishes empty records from unavailable", async () => {
    db.state.tables.weddings[0].total_budget_minor = null; db.state.tables.budget_items = []; db.state.tables.payments = [];
    expect(await executeAssistantReadTool("get_budget_summary")).toMatchObject({ status: "empty", data: { totalBudgetMinor: null, committedMinor: 0, availableMinor: null } });
    db.state.errors.add("payments");
    expect(await executeAssistantReadTool("get_budget_summary")).toMatchObject({ status: "unavailable", evidence: [] });
  });
  it.each(["budget_items", "payments"])("fails closed on %s errors, including errors plus data", async (table) => {
    db.state.errors.add(table);
    const result = await executeAssistantReadTool("get_budget_summary");
    expect(result.status).toBe("unavailable"); expect(result).not.toHaveProperty("data"); expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
  });
  it("splits unpaid payments and preserves their labels through Phase 1A classification", async () => {
    const result = await data("get_upcoming_payments", c.paymentData);
    expect(result.overdue.map((p) => p.id)).toEqual([uuid(601)]); expect(result.upcoming.map((p) => p.id)).toEqual([uuid(602)]); expect(result.undated.map((p) => p.id)).toEqual([uuid(603)]);
    expect(result.overdue[0]).toMatchObject({ expenseLabel: "Photographer", label: "Deposit", category: "Photography" }); expect(JSON.stringify(result)).not.toContain("SENTINEL");
  });
  it("bounds each group independently and never under-reports a full group as complete", async () => {
    db.state.tables.payments = Array.from({ length: 25 }, (_, i) => payment(700 + i));
    const result = await data("get_upcoming_payments", c.paymentData, { limitPerGroup: 20 });
    expect(result.upcoming).toHaveLength(20); expect(result.hasMore.upcoming).toBe(true);
    expect(await executeAssistantReadTool("get_upcoming_payments", { limitPerGroup: 21 })).toMatchObject({ error: { code: "INVALID_INPUT" } });
  });
  it("returns EMPTY when there are no unpaid payments, UNAVAILABLE on read failures", async () => {
    db.state.tables.payments = [payment(600, { is_paid: true })];
    expect(await executeAssistantReadTool("get_upcoming_payments")).toMatchObject({ status: "empty", data: { overdue: [], upcoming: [], undated: [] } });
    db.state.errors.add("payments"); expect((await executeAssistantReadTool("get_upcoming_payments")).status).toBe("unavailable");
  });
});

describe("Marketplace, Couple vendors and comparison", () => {
  it.each([
    { category: "venues" }, { subcategory: "djs" }, { city: "Haifa" }, { area: "north" },
    { minPriceMinor: 300000 }, { maxPriceMinor: 50000 }, { style: "Rustic" },
    { eventType: "daytime" }, { guestCount: 600 }, { guestCount: 50 }, { fridayAvailable: false },
  ])("excludes listings that do not meet an explicit filter: %j", async (input) => {
    expect(await executeAssistantReadTool("search_marketplace_vendors", input)).toMatchObject({ status: "empty", data: { vendors: [] } });
  });
  it("uses bounded database filters for all supported listing attributes", async () => {
    db.state.tables.vendor_profiles.push(vendor({ id: uuid(102), is_public: false, business_name: "Hidden" }), vendor({ id: uuid(103), location_city: "Haifa", business_name: "Wrong City" }));
    db.state.tables.reviews = [review(800), review(801, { vendor_id: vendorTwo, professionalism: 1, punctuality: 1, service_attitude: 1, value_for_money: 1 }), review(802, { is_public: false, professionalism: 1 })];
    const result = await data("search_marketplace_vendors", c.marketplaceData, { category: "photography-content", subcategory: "photographers", city: "tel aviv", area: "central_israel", minPriceMinor: 100000, maxPriceMinor: 200000, style: "Romantic", eventType: "evening", guestCount: 250, minRating: 4, fridayAvailable: true });
    expect(result.vendors.map((v) => v.id)).toEqual([vendorId]); expect(result.vendors[0]).toMatchObject({ ratingAverage: 5, reviewCount: 1 }); expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    const call = db.state.calls.find((call) => call.table === "vendor_profiles")!;
    expect(call.selection).toContain("vendor_categories!inner"); expect(call.selection).toContain("vendor_subcategories!inner");
    for (const method of ["eq", "ilike", "overlaps", "gte", "lte", "contains", "range"]) expect(call.operations.some((op) => op[0] === method)).toBe(true);
  });
  it("never returns or selects a full 496-vendor context", async () => {
    db.state.tables.vendor_profiles = Array.from({ length: 496 }, (_, i) => vendor({ id: uuid(1000 + i), business_name: `Studio ${i}` }));
    const result = await data("search_marketplace_vendors", c.marketplaceData);
    expect(result.vendors).toHaveLength(12); expect(result.pagination.hasMore).toBe(true);
    expect(db.state.calls.find((call) => call.table === "vendor_profiles")!.operations).toContainEqual(["range", 0, 12]);
    expect(await executeAssistantReadTool("search_marketplace_vendors", { limit: 496 })).toMatchObject({ error: { code: "INVALID_INPUT" } });
    const second = await data("search_marketplace_vendors", c.marketplaceData, { page: 2 });
    expect(second.vendors.every((v) => !result.vendors.some((first) => first.id === v.id))).toBe(true);
  });
  function ratingCandidates(count: number, matching: number[]) {
    db.state.tables.vendor_profiles = Array.from({ length: count }, (_, i) => vendor({ id: uuid(2000 + i), business_name: `Studio ${String(i).padStart(4, "0")}` }));
    db.state.tables.reviews = Array.from({ length: count }, (_, i) => {
      const score = matching.includes(i) ? 5 : 1;
      return review(4000 + i, { vendor_id: uuid(2000 + i), professionalism: score, punctuality: score, service_attitude: score, value_for_money: score });
    });
  }
  it("continues past a raw chunk without rating matches and returns only filtered results/evidence", async () => {
    ratingCandidates(60, [52, 57]);
    const result = await executeAssistantReadTool("search_marketplace_vendors", { minRating: 4, limit: 1 });
    expect(result).toMatchObject({ status: "success", data: { vendors: [{ id: uuid(2052) }], pagination: { hasMore: true }, paginationBasis: "filtered_results" }, evidence: [{ kind: "MARKETPLACE_DATA", vendorIds: [uuid(2052)], marketScope: "ever_after_marketplace_only" }] });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_SENTINEL|review_text|reviewer_display_name|phone|email/);
    expect(db.state.calls.filter((call) => call.table === "vendor_profiles").map((call) => call.operations.find((op) => op[0] === "range"))).toEqual([["range", 0, 50], ["range", 50, 100]]);
  });
  it("establishes genuine empty results after exhausting all rating candidates", async () => {
    ratingCandidates(60, []);
    expect(await executeAssistantReadTool("search_marketplace_vendors", { minRating: 4 })).toMatchObject({ status: "empty", data: { vendors: [], pagination: { hasMore: false } }, evidence: [{ kind: "MARKETPLACE_DATA", vendorIds: [] }] });
  });
  it("paginates the filtered sequence stably without duplicate vendors, including tied names", async () => {
    ratingCandidates(110, [1, 52, 53, 75, 101]);
    db.state.tables.vendor_profiles[53].business_name = db.state.tables.vendor_profiles[52].business_name;
    const pages = [];
    for (const page of [1, 2, 3, 4]) pages.push(await data("search_marketplace_vendors", c.marketplaceData, { minRating: 4, limit: 2, page }));
    expect(pages.map((page) => page.vendors.map((vendor) => vendor.id))).toEqual([[uuid(2001), uuid(2052)], [uuid(2053), uuid(2075)], [uuid(2101)], []]);
    expect(pages.map((page) => page.pagination.hasMore)).toEqual([true, true, false, false]);
    const ids = pages.flatMap((page) => page.vendors.map((vendor) => vendor.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(await data("search_marketplace_vendors", c.marketplaceData, { minRating: 4, limit: 2, page: 2 })).toEqual(pages[1]);
  });
  it("keeps category and city filters on every rating-scan chunk", async () => {
    ratingCandidates(70, [0, 1, 55, 60]);
    db.state.tables.vendor_categories.push({ id: uuid(299), slug: "venues", name: "Venues" });
    db.state.tables.vendor_profiles[0].category_id = uuid(299);
    db.state.tables.vendor_profiles[1].location_city = "Haifa";
    const result = await data("search_marketplace_vendors", c.marketplaceData, { minRating: 4, category: "photography-content", city: "Tel Aviv", limit: 2 });
    expect(result.vendors.map((vendor) => vendor.id)).toEqual([uuid(2055), uuid(2060)]);
    expect(result.pagination.hasMore).toBe(false);
    const calls = db.state.calls.filter((call) => call.table === "vendor_profiles");
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.operations).toContainEqual(["eq", "vendor_categories.slug", "photography-content"]);
      expect(call.operations).toContainEqual(["ilike", "location_city", "Tel Aviv"]);
    }
  });
  it("does not infer hasMore from remaining raw candidates and stops once a filtered lookahead exists", async () => {
    ratingCandidates(110, [0]);
    const last = await data("search_marketplace_vendors", c.marketplaceData, { minRating: 4, limit: 1 });
    expect(last.vendors.map((vendor) => vendor.id)).toEqual([uuid(2000)]); expect(last.pagination.hasMore).toBe(false);
    db.state.calls = [];
    ratingCandidates(110, [0, 1]);
    expect((await data("search_marketplace_vendors", c.marketplaceData, { minRating: 4, limit: 1 })).pagination.hasMore).toBe(true);
    expect(db.state.calls.filter((call) => call.table === "vendor_profiles")).toHaveLength(1);
  });
  it("preserves default/max output bounds for rating searches", async () => {
    ratingCandidates(60, Array.from({ length: 60 }, (_, i) => i));
    expect((await data("search_marketplace_vendors", c.marketplaceData, { minRating: 4 })).vendors).toHaveLength(12);
    const result = await data("search_marketplace_vendors", c.marketplaceData, { minRating: 4, limit: 20 });
    expect(result.vendors).toHaveLength(20); expect(result.pagination.hasMore).toBe(true);
    expect(await executeAssistantReadTool("search_marketplace_vendors", { minRating: 4, limit: 21 })).toMatchObject({ error: { code: "INVALID_INPUT" } });
  });
  it.each([{ matching: [] }, { matching: [0] }])("fails explicitly at the scan cap without returning uncertain data: %j", async ({ matching }) => {
    ratingCandidates(c.MARKETPLACE_SCAN.maxCandidates + 1, matching);
    const result = await executeAssistantReadTool("search_marketplace_vendors", { minRating: 4, limit: 1 });
    expect(result).toMatchObject({ status: "unavailable", error: { code: "READ_LIMIT_EXCEEDED" }, evidence: [] });
    expect(result).not.toHaveProperty("data");
    const calls = db.state.calls.filter((call) => call.table === "vendor_profiles");
    expect(calls).toHaveLength(c.MARKETPLACE_SCAN.maxCandidates / c.MARKETPLACE_SCAN.chunk);
    expect(calls.at(-1)?.operations).toContainEqual(["range", 950, 1000]);
  });
  it("can prove exhaustion exactly at the candidate cap", async () => {
    ratingCandidates(c.MARKETPLACE_SCAN.maxCandidates, []);
    expect(await executeAssistantReadTool("search_marketplace_vendors", { minRating: 4 })).toMatchObject({ status: "empty", data: { vendors: [], pagination: { hasMore: false } } });
  });
  it("quotes search text as values and never allows it to bypass public filtering", async () => {
    const input = 'Studio",is_public.eq.false,foo="';
    const result = await data("search_marketplace_vendors", c.marketplaceData, { search: input });
    expect(result.vendors).toEqual([]);
    const call = db.state.calls.find((call) => call.table === "vendor_profiles")!;
    expect(call.operations).toContainEqual(["eq", "is_public", true]);
    expect(call.operations.find((op) => op[0] === "or")?.[1]).toContain('Studio\\"');
    expect((await data("search_marketplace_vendors", c.marketplaceData, { search: "Original" })).vendors[0].id).toBe(vendorId);
  });
  it("uses lifecycle/saved/source/category filters while omitting relationship and external private data", async () => {
    db.state.tables.external_vendors = [{ id: uuid(900), wedding_id: weddingId, business_name: "External Quartet", category_id: uuid(200), subcategory_id: null, phone: "PRIVATE_SENTINEL", notes: "PRIVATE_SENTINEL" }];
    db.state.tables.couple_vendors = [relation(901), relation(902, { vendor_id: null, external_vendor_id: uuid(900), status: "booked", is_saved: false }), relation(903, { wedding_id: otherWedding, status: "booked" })];
    const result = await data("get_couple_vendors", c.coupleVendorData, { source: "external", lifecycle: "booked", saved: false, category: "photography-content" });
    expect(result.vendors).toHaveLength(1); expect(result.vendors[0].vendor).toEqual({ id: uuid(900), businessName: "External Quartet", source: "external", category: { slug: "photography-content", name: "Photography & Content" }, subcategory: null });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    const marketplace = await executeAssistantReadTool("get_couple_vendors", { saved: true, lifecycle: "considering" });
    expect(marketplace).toMatchObject({ evidence: [{ kind: "COUPLE_DATA", section: "vendors" }, { kind: "MARKETPLACE_DATA", vendorIds: [vendorId] }] });
    expect((await executeAssistantReadTool("get_couple_vendors", { category: "no-matches" })).status).toBe("empty");
  });
  it("bounds Couple vendor pages and fails closed for unreadable relationships", async () => {
    db.state.tables.couple_vendors = Array.from({ length: 25 }, (_, i) => relation(1000 + i));
    const result = await data("get_couple_vendors", c.coupleVendorData, { limit: 20 });
    expect(result.vendors).toHaveLength(20); expect(result.pagination.hasMore).toBe(true);
    db.state.errors.add("couple_vendors"); expect((await executeAssistantReadTool("get_couple_vendors")).status).toBe("unavailable");
    db.state.errors.clear(); db.state.tables.couple_vendors = [relation(1000, { vendor_id: uuid(99999) })];
    expect((await executeAssistantReadTool("get_couple_vendors")).status).toBe("unavailable");
  });
  it("uses the approved recommendation engine for factual score, reasons and dimensions", async () => {
    const spy = vi.spyOn(scoring, "calculateRecommendation");
    db.state.tables.reviews = [review(800)];
    const result = await data("compare_vendors", c.comparisonData, { vendorIds: [vendorId, vendorTwo] });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.vendors[0].recommendation).toEqual(scoring.calculateRecommendation(result.matchContext, result.vendors[0].vendor));
    expect(result.vendors[0].recommendation.score).toBe(100); expect(result.vendors[0].scoreStatus).toBe("calculated");
    expect(result.vendors[0].recommendation.reasons).toContainEqual(expect.objectContaining({ dimension: "area", label: "Serves central_israel" }));
    expect(result.vendors[1].missingEvidence).toContain("rating");
  });
  it("withholds unfair scores without inventing missing evidence or vendors", async () => {
    Object.assign(db.state.tables.weddings[0], { preferred_area: null, total_budget_minor: null, styles: [], guest_count: null, event_type: null });
    db.state.tables.reviews = [review(800)];
    const result = await data("compare_vendors", c.comparisonData, { vendorIds: [vendorId, uuid(99999)] });
    expect(result.vendors[0].scoreStatus).toBe("insufficient_evidence"); expect(result.vendors[0].recommendation.score).toBeNull(); expect(result.vendors[0].missingEvidence).toContain("budget"); expect(result.missingVendorIds).toEqual([uuid(99999)]);
    expect(await executeAssistantReadTool("compare_vendors", { vendorIds: [vendorId, vendorId] })).toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(await executeAssistantReadTool("compare_vendors", { vendorIds: Array.from({ length: 5 }, (_, i) => uuid(100 + i)) })).toMatchObject({ error: { code: "INVALID_INPUT" } });
  });
  it("returns UNAVAILABLE rather than fabricated ratings after a review error", async () => {
    db.state.errors.add("reviews"); expect((await executeAssistantReadTool("search_marketplace_vendors")).status).toBe("unavailable"); expect((await executeAssistantReadTool("compare_vendors", inputFor("compare_vendors"))).status).toBe("unavailable");
  });
  it("never calculates a partial rating when review processing reaches its cap", async () => {
    db.state.tables.reviews = Array.from({ length: 5001 }, (_, i) => review(1000 + i));
    const result = await executeAssistantReadTool("search_marketplace_vendors");
    expect(result).toMatchObject({ status: "unavailable", error: { code: "READ_LIMIT_EXCEEDED" } });
    expect(result).not.toHaveProperty("data");
  });
});

describe("Guest PII and aggregate completeness", () => {
  it("returns exactly five aggregate fields and excludes all Guest PII even if a source returns extras", async () => {
    db.state.tables.guests = [{ id: uuid(1000), wedding_id: weddingId, rsvp_status: "attending", invited_count: 4, attending_count: 3, full_name: "GUEST_NAME_SENTINEL", phone: "GUEST_PHONE_SENTINEL", email: "GUEST_EMAIL_SENTINEL", dietary_notes: "GUEST_DIET_SENTINEL", private_notes: "GUEST_NOTE_SENTINEL" }, { id: uuid(1001), wedding_id: otherWedding, rsvp_status: "invited", invited_count: 99, attending_count: null }];
    const result = await data("get_guest_list_summary", c.guestData);
    expect(result).toEqual({ invited: 4, attending: 3, awaitingResponse: 0, notAttending: 1, notYetInvited: 0 });
    expect(JSON.stringify(result)).not.toMatch(/SENTINEL|name|phone|email|notes|guest_id/);
    expect(db.state.calls.find((call) => call.table === "guests")?.selection).toBe("rsvp_status, invited_count, attending_count");
  });
  it("distinguishes genuinely empty Guest List, null data, and errors", async () => {
    expect(await executeAssistantReadTool("get_guest_list_summary")).toMatchObject({ status: "empty", data: { invited: 0 } });
    db.state.nullResults.add("guests"); expect((await executeAssistantReadTool("get_guest_list_summary")).status).toBe("unavailable");
    db.state.nullResults.clear(); db.state.rejected.add("guests");
    const result = await executeAssistantReadTool("get_guest_list_summary"); expect(result).toMatchObject({ status: "unavailable", evidence: [] }); expect(result).not.toHaveProperty("data");
  });
  it("returns unavailable instead of incomplete aggregates when a processing cap is exceeded", async () => {
    db.state.tables.guests = Array.from({ length: 10001 }, (_, i) => ({ id: uuid(1000 + i), wedding_id: weddingId, rsvp_status: "invited", invited_count: 1, attending_count: null }));
    const result = await executeAssistantReadTool("get_guest_list_summary");
    expect(result).toMatchObject({ status: "unavailable", error: { code: "READ_LIMIT_EXCEEDED" } }); expect(result).not.toHaveProperty("data");
  });
  it.each(names)("audits %s output and SQL selections for private data", async (name) => {
    const result = await executeAssistantReadTool(name, inputFor(name));
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    for (const call of db.state.calls) expect(call.selection).not.toMatch(/\*|\b(phone|email|notes|private_notes|dietary_notes|review_text|reviewer_display_name|avatar_choice|avatar_storage_path|contact_override|password|token)\b/);
  });
});
