import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { buildPlanningState, weddingPhase } from "@/lib/assistant/planning/roadmap";
import { planOrchestration, readToolName } from "@/lib/assistant/planning/policy";
import { normalizedQuoteSchema, prepareQuote } from "@/lib/assistant/planning/quotes";
import { buildConversationWindow, resolveFollowUp } from "@/lib/assistant/planning/conversation";
import { futureResearchContracts } from "@/lib/assistant/research/contracts";

const now = new Date("2026-09-07T10:00:00Z");
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const evidence = (section = "wedding") => [{ kind: "COUPLE_DATA", section }];
const result = <T>(data: T, section = "wedding") => ({ status: "success", data, evidence: evidence(section) });
const failed = { status: "unavailable", error: { code: "SOURCE_UNAVAILABLE", message: "Unavailable", retryable: true }, evidence: [] };
const wedding = () => ({ weddingDate: "2026-09-12", guestCount: 237, preferredArea: "central_israel", eventType: "evening", styles: ["Romantic"], priorities: ["Photography"], totalBudgetMinor: 100, setupStatus: "completed", venueStatus: "booked", venueName: "Venue", bookedCategories: ["Venue"] });
const task = (n = 1, dueDate: string | null = "2026-09-06") => ({ id: uuid(n), title: "משימה", category: null, dueDate, priority: "medium", status: "open" });
const payment = (n = 1, dueDate: string | null = "2026-09-06") => ({ id: uuid(n), label: "Payment", amountMinor: 1, dueDate, expenseLabel: "Expense", category: null });
const vendor = (lifecycle = "booked") => ({ relationshipId: uuid(9), saved: true, lifecycle, agreedPriceMinor: 1, vendor: { source: "external", id: uuid(10), businessName: "שם עסק", category: { slug: "photography-content", name: "Photography" }, subcategory: { slug: "wedding-photographers", name: "Photographer" } } });
const sources = () => ({
  wedding: result(wedding()), tasks: { input: {}, result: result({ tasks: [task()], pagination: { page: 1, limit: 25, hasMore: false }, asOfDate: "2026-09-07" }, "tasks") },
  vendors: { input: {}, result: result({ vendors: [vendor()], pagination: { page: 1, limit: 12, hasMore: false } }, "vendors") },
  budget: result({ totalBudgetMinor: 100, projectedMinor: 110, committedMinor: 110, paidMinor: 10, availableMinor: -10, remainingCommittedMinor: 100 }, "budget"),
  payments: result({ overdue: [payment()], upcoming: [payment(2, "2026-09-09")], undated: [payment(3, null)], hasMore: { overdue: false, upcoming: false, undated: false }, asOfDate: "2026-09-07" }, "budget"),
  guests: result({ invited: 100, attending: 70, awaitingResponse: 25, notAttending: 5, notYetInvited: 3 }, "guestList"),
  missing: { status: "empty", data: { fields: [], setupStatus: "completed", setupComplete: true }, evidence: evidence() },
});
describe("personalized planning state", () => {
  it("retains actual planning facts and deterministic signals with evidence", () => {
    const state = buildPlanningState(sources(), {}, now);
    expect(state.facts.wedding).toMatchObject({ guestCount: 237, styles: ["Romantic"] });
    expect(state.phase).toMatchObject({ key: "wedding_week", daysRemaining: 5 });
    expect(state.signals.map((item) => item.reason)).toEqual(expect.arrayContaining(["task_overdue", "payment_overdue", "payment_due", "payment_undated", "budget_overcommitted", "rsvp_pending", "invitations_pending"]));
    expect(state.signals.every((item) => item.kind === "DETERMINISTIC_SIGNAL" && item.basis.length > 0)).toBe(true);
    expect(state.sourceEvidence.budget).toEqual(evidence("budget"));
    expect(state.overallState).toBe("attention_signals"); expect(state.analysisOnly).toBe(true);
  });
  it.each(["relationship", "setup"])("does not suggest finding an already booked photographer (%s)", (where) => {
    const input = sources();
    if (where === "setup") { input.wedding.data.bookedCategories.push("Photographer"); input.vendors.result.data.vendors = []; }
    const state = buildPlanningState(input, {}, now);
    expect(state.vendorGaps.find((gap) => gap.category === "photographer")?.state).toBe(where === "setup" ? "REPORTED_ARRANGED_DETAILS_LATER" : "CONFIRMED_BOOKED");
    if (where === "setup") expect(state.signals.some(s => s.reason === "vendor_details_needed")).toBe(true);
    expect(state.signals.some((signal) => signal.id === "vendor:photographer")).toBe(false);
  });
  it("raises a preferred missing category near the wedding, respects lower priority and saved state", () => {
    const input = sources(); input.vendors.result.data.vendors = [vendor("considering")];
    const state = buildPlanningState(input, {}, now);
    expect(state.vendorGaps.find((gap) => gap.category === "photographer")).toMatchObject({ state: "NOT_RECORDED_AS_BOOKED", priority: "high" });
    expect(state.facts.vendors?.vendors[0]).toMatchObject({ saved: true, lifecycle: "considering" });
    expect(buildPlanningState(input, { lowerPriorityCategories: ["photographer"] }, now).vendorGaps.find((gap) => gap.category === "photographer")?.priority).toBe("low");
    input.wedding.data.priorities = [];
    expect(buildPlanningState(input, {}, now).vendorGaps.some((gap) => gap.category === "photographer")).toBe(false);
  });
  it.each(["partial", "filtered", "unavailable", "ambiguous"])("keeps missing category unknown with %s vendor evidence", (mode) => {
    const input = sources(); input.vendors.result.data.vendors = [];
    const vendors = mode === "unavailable" ? { input: {}, result: failed } : mode === "filtered" ? { ...input.vendors, input: { saved: true } }
      : mode === "ambiguous" ? { ...input.vendors, result: result({ ...input.vendors.result.data, vendors: [{ ...vendor(), vendor: { ...vendor().vendor, subcategory: null } }] }, "vendors") }
        : { ...input.vendors, result: result({ ...input.vendors.result.data, pagination: { page: 1, limit: 12, hasMore: true } }, "vendors") };
    expect(buildPlanningState({ ...input, vendors }, {}, now).vendorGaps.find((gap) => gap.category === "photographer")?.state).toBe("UNKNOWN_NEEDS_REVIEW");
  });
  it("never substitutes failed reads with empty facts or a zero budget", () => {
    const state = buildPlanningState({ ...sources(), budget: failed, guests: failed, payments: failed }, {}, now);
    expect(state.facts.budget).toBeNull(); expect(state.facts.guests).toBeNull(); expect(state.facts.payments).toBeNull();
    expect(state.overallState).toBe("limited"); expect(state.signals.some((item) => item.reason === "budget_overcommitted")).toBe(false);
    expect(state.sourceEvidence.budget).toEqual([]);
  });
  it("separates upcoming, overdue, completed and undated tasks with bounded windows", () => {
    const input = sources(); input.tasks.result.data.tasks = [task(1), task(2, "2026-09-09"), task(3, "2026-09-20"), task(4, "2026-11-01"), task(5, null), { ...task(6), status: "completed" }];
    const signals = buildPlanningState(input, {}, now).signals.filter((item) => item.id.startsWith("task:"));
    expect(signals.map((item) => item.bucket)).toEqual(["immediate", "next_7_days", "next_30_days", "later", "undated"]);
    expect(signals[0].priority).toBe("high");
    expect(buildPlanningState(input, { horizonDays: 7 }, now).signals.find((item) => item.id === `task:${uuid(3)}`)?.bucket).toBe("later");
  });
  it("caps each roadmap window and reports omissions instead of claiming completeness", () => {
    const input = sources(); input.tasks.input = { limit: 50 }; input.tasks.result.data.pagination.limit = 50;
    input.tasks.result.data.tasks = Array.from({ length: 50 }, (_, n) => task(n + 100));
    const state = buildPlanningState(input, {}, now); const immediate = state.roadmap.find((item) => item.window === "immediate")!;
    expect(immediate.signalIds).toHaveLength(20); expect(immediate.omitted).toBeGreaterThan(0);
    expect(state.signals.length).toBeLessThanOrEqual(150);
    expect(() => buildPlanningState({ ...input, tasks: { ...input.tasks, result: { ...input.tasks.result, data: { ...input.tasks.result.data, tasks: Array.from({ length: 51 }, (_, n) => task(n + 100)) } } } }, {}, now)).toThrow();
  });
  it("rejects stale date snapshots and inconsistent pagination metadata", () => {
    const input = sources(); input.tasks.result.data.asOfDate = "2026-09-06";
    expect(() => buildPlanningState(input, {}, now)).toThrow("fresh");
    const other = sources(); other.tasks.result.data.pagination.page = 2;
    expect(() => buildPlanningState(other, {}, now)).toThrow("pagination");
  });
  it("classifies due-today payments as upcoming, and keeps incomplete task/payment data explicit", () => {
    const input = sources(); input.payments.data.upcoming = [payment(2, "2026-09-07")];
    input.payments.data.hasMore.upcoming = true; input.tasks.result.data.pagination.hasMore = true;
    const state = buildPlanningState(input, {}, now);
    expect(state.signals.find((item) => item.id === `payment:${uuid(2)}`)).toMatchObject({ reason: "payment_due", bucket: "immediate" });
    expect(state.limitations).toEqual(expect.arrayContaining(["tasks_partial_selection", "payments_partial_selection"]));
    expect(state.overallState).toBe("limited");
  });
  it("keeps missing dates limited without dropping absolute task/payment deadlines", () => {
    const state = buildPlanningState({ ...sources(), wedding: result({ ...wedding(), weddingDate: null }) }, {}, now);
    expect(state.phase.key).toBe("unknown_date"); expect(state.phase.daysRemaining).toBeNull();
    expect(state.limitations).toContain("date_guidance_limited"); expect(state.signals.some((item) => item.reason === "task_overdue")).toBe(true);
    expect(state.signals.some((item) => item.reason === "rsvp_pending")).toBe(false);
  });
  it("does not invent post-wedding vendor bookings, RSVP work or operational schedules", () => {
    const input = sources(); input.wedding.data.weddingDate = "2026-09-06"; input.vendors.result.data.vendors = [];
    const state = buildPlanningState(input, {}, now);
    expect(state.phase).toMatchObject({ key: "post_wedding", daysRemaining: 0, daysSinceWedding: 1 });
    expect(state.signals.some((item) => ["vendor_not_recorded_booked", "rsvp_pending"].includes(item.reason))).toBe(false);
    expect(state.signals.some((item) => item.reason === "payment_overdue")).toBe(true);
    expect(JSON.stringify(state)).not.toMatch(/arrivalTime|transportTime|dayOfSchedule|venueInstructions/);
  });
  it("strips Guest PII and account/vendor/task/payment private fields from planning output", () => {
    const input = sources(); const pii = { phone: "PRIVATE_SENTINEL", email: "PRIVATE_SENTINEL", privateNotes: "PRIVATE_SENTINEL", guests: [{ name: "PRIVATE_SENTINEL" }] };
    const state = buildPlanningState({ ...input, wedding: result({ ...wedding(), ...pii }), guests: result({ ...input.guests.data, ...pii }, "guestList"),
      tasks: { ...input.tasks, result: result({ ...input.tasks.result.data, tasks: [{ ...task(), notes: "PRIVATE_SENTINEL" }] }, "tasks") },
      vendors: { ...input.vendors, result: result({ ...input.vendors.result.data, vendors: [{ ...vendor(), ...pii, vendor: { ...vendor().vendor, ...pii } }] }, "vendors") },
      payments: result({ ...input.payments.data, overdue: [{ ...payment(), ...pii }] }, "budget") }, {}, now);
    expect(JSON.stringify(state)).not.toContain("PRIVATE_SENTINEL");
    expect(state.facts.guests).toEqual(input.guests.data); expect(state.facts.vendors?.vendors[0].vendor.businessName).toBe("שם עסק");
  });
});
describe("wedding calendar phases", () => {
  it.each([[null, "unknown_date", null], ["2026-12-01", "before_wedding", 85], ["2026-10-07", "final_month", 30], ["2026-09-15", "final_month", 8], ["2026-09-14", "wedding_week", 7], ["2026-09-08", "wedding_week", 1], ["2026-09-07", "wedding_day", 0], ["2026-09-06", "post_wedding", 0]])("classifies %s as %s", (date, key, remaining) => {
    const phase = weddingPhase(date, now); expect(phase.key).toBe(key); expect(phase.daysRemaining).toBe(remaining);
  });
  it("uses the Israel calendar across UTC midnight without changing system time", () => {
    expect(weddingPhase("2026-09-08", new Date("2026-09-07T22:00:00Z")).key).toBe("wedding_day");
    expect(() => weddingPhase("invalid", now)).toThrow();
  });
});
describe("orchestration and quote clarification", () => {
  it("selects the smallest guest read and separates budget facts from market realism", () => {
    expect(planOrchestration({ capability: "guest_insights", scope: "in_scope" }).readTools).toEqual(["get_guest_list_summary"]);
    expect(planOrchestration({ capability: "budget", scope: "in_scope" }).research.route).toBe("internal_only");
    expect(planOrchestration({ capability: "budget", scope: "in_scope", needsMarketComparison: true }).research.route).toBe("benchmark");
    expect(planOrchestration({ capability: "quote_evaluation", scope: "out_of_scope" }).readTools).toEqual([]);
    expect(planOrchestration({ capability: "roadmap", scope: "uncertain" }).research.route).toBe("clarify");
  });
  it("asks for material package facts without asking again for known region/date/guest count", () => {
    const prepared = prepareQuote({ category: "photography", quotedPrice: { amountMinor: 2, currency: "ILS" } }, wedding(), now);
    expect(prepared.clarification.missingFields.map((field) => field.field)).toEqual(["coverageHours", "videoIncluded"]);
    expect(prepared.researchRequest).toBeNull();
  });
  it("normalizes complete quote scope, preserves false video and coarsens known wedding context", () => {
    const prepared = prepareQuote({ category: "photography", service: "stills", quotedPrice: { amountMinor: 2, currency: "ILS" }, coverageHours: 10, numberOfProfessionals: 2, inclusions: ["albums"], addOns: ["drone"], videoIncluded: false }, wedding(), now);
    expect(prepared.clarification.required).toBe(false);
    expect(prepared.researchRequest?.attributes).toMatchObject({ coverageHours: 10, numberOfProfessionals: 2, videoIncluded: false, weddingMonth: "2026-09", guestScale: { lower: 201, upper: 250 }, packageFeatures: ["albums"] });
    expect(prepared.limitations).toContain("add_on_price_scope_unverified"); expect(prepared.researchLive).toBe(false);
  });
  it.each([{ coverageHours: 0 }, { numberOfProfessionals: -1 }, { quotedPrice: { amountMinor: -1, currency: "ILS" } }, { quotedPrice: { amountMinor: 1 } }, { category: "politics" }, { rawText: "PRIVATE_SENTINEL" }, { phone: "PRIVATE_SENTINEL" }, { service: "photo_video", videoIncluded: false }, { service: "dj", category: "photography" }])("rejects unsafe/invalid quote %j", (raw) => expect(normalizedQuoteSchema.safeParse(raw).success).toBe(false));
});
describe("bounded conversation and follow-up pointers", () => {
  const message = (n: number, content = "שיחה טבעית") => ({ id: uuid(n), role: "user", content, created_at: `2026-09-07T10:00:0${n}Z` });
  const snapshot = () => ({ weddingId: uuid(1), threadId: uuid(2), capturedAt: now.toISOString(), topic: "vendor_comparison", vendorIds: [uuid(3), uuid(4)], tools: [{ name: "compare_vendors", status: "success" }], clarification: null });
  const authorized = { weddingId: uuid(1), threadId: uuid(2), vendorIds: [uuid(3), uuid(4)] };
  it("orders recent messages and preserves language while excluding extra row fields", () => {
    const window = buildConversationWindow([{ ...message(2), notes: "PRIVATE_SENTINEL" }, message(1)]);
    expect(window.messages.map((row) => row.id)).toEqual([uuid(1), uuid(2)]); expect(window.messages[0].content).toBe("שיחה טבעית");
    expect(JSON.stringify(window)).not.toContain("PRIVATE_SENTINEL"); expect(window.providerReady).toBe(false);
  });
  it("bounds message count/content and supports server-selected relevance without silent truncation", () => {
    const window = buildConversationWindow(Array.from({ length: 8 }, (_, n) => message(n, "x".repeat(2000))), true);
    expect(window.characterCount).toBe(10000); expect(window.messages).toHaveLength(5); expect(window.incomplete).toBe(true);
    expect(buildConversationWindow([message(1, "x".repeat(2001))]).messages).toEqual([]);
    expect(() => buildConversationWindow(Array.from({ length: 9 }, (_, n) => message(n)))).toThrow();
    expect(buildConversationWindow([message(1), message(2)], false, [uuid(2)]).messages.map((row) => row.id)).toEqual([uuid(2)]);
  });
  it("resolves discussed vendors without names, refreshes facts and removes stale authorization", () => {
    const result = resolveFollowUp(snapshot(), { ...authorized, vendorIds: [uuid(4)] }, [], now);
    expect(result).toMatchObject({ status: "success", vendorIds: [uuid(4)], droppedVendorReferences: 1, refreshToolResults: true });
    expect(result).not.toHaveProperty("weddingId");
  });
  it("rejects expired/cross-thread references, excess vendors and raw tool payloads", () => {
    expect(resolveFollowUp(snapshot(), { ...authorized, threadId: uuid(99) }, [], now).status).toBe("unavailable");
    expect(resolveFollowUp(snapshot(), authorized, [], new Date(now.getTime() + 900001)).status).toBe("unavailable");
    expect(() => resolveFollowUp({ ...snapshot(), vendorIds: Array.from({ length: 5 }, (_, n) => uuid(n)) }, authorized, [], now)).toThrow();
    expect(() => resolveFollowUp({ ...snapshot(), tools: [{ name: "compare_vendors", status: "success", data: { notes: "PRIVATE_SENTINEL" } }] }, authorized, [], now)).toThrow();
  });
  it("does not repeat a clarification already resolved by known context", () => {
    const clarification = { required: true, missingFields: [{ field: "region", questionIntent: "locate_event", reason: "regional_comparability" }] };
    expect(resolveFollowUp({ ...snapshot(), clarification }, authorized, ["region"], now)).toMatchObject({ clarification: { required: false, missingFields: [] } });
  });
});
it("keeps execution allowlists READ-only, research disabled and the new layer free of write/network/provider calls", () => {
  const registry = readFileSync("src/lib/assistant/tools/registry.ts", "utf8");
  expect([...registry.matchAll(/^  ([a-z_]+):/gm)].map((match) => match[1])).toEqual(readToolName.options);
  expect(Object.values(futureResearchContracts).every((contract) => contract.live === false && !("execute" in contract))).toBe(true);
  for (const file of readdirSync("src/lib/assistant/planning")) expect(readFileSync(`src/lib/assistant/planning/${file}`, "utf8")).not.toMatch(/\.insert\(|\.upsert\(|\.update\(|\.delete\(|\bfetch\(|from ["'](?:openai|@anthropic)|executeAssistantReadTool\(/);
});

it("waiting produces a follow-up signal while preserving overdue urgency", () => {
  const input = sources(); input.tasks.result.data.tasks[0].status = "waiting_on_vendor";
  const signal = buildPlanningState(input, {}, now).signals.find(s => s.id.startsWith("task:"));
  expect(signal).toMatchObject({ taskAction: "follow_up", reason: "task_overdue", priority: "high", bucket: "immediate" });
  expect(signal).not.toHaveProperty("vendorId");
});
