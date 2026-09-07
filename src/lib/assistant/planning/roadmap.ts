import { BOOKING_STATES, categoryBookingState } from "@/lib/domain/booking-state";
import { z } from "zod";
import { getWeddingPhase } from "@/lib/domain/wedding-week";
import { calendarDayDifference } from "@/lib/domain/date-status";
import { israelCalendarDate, classifyUnpaidPayments } from "../payments";
import * as c from "../tools/contracts";
import { readToolName } from "./policy";

export const planningCategory = z.enum(["venue", "photographer", "videographer", "dj", "dress", "suit", "makeup", "design", "flowers", "officiant", "manager", "transportation"]);
type Category = z.output<typeof planningCategory>;
const preferenceCategories: Record<string, Category> = { Photography: "photographer", "Music and party atmosphere": "dj", "Design and aesthetics": "design" };
export const planningRequestSchema = z.object({
  horizonDays: z.number().int().min(1).max(30).default(30),
  desiredCategories: z.array(planningCategory).max(12).default([]),
  lowerPriorityCategories: z.array(planningCategory).max(12).default([]),
}).strict();
// These are fresh server-owned tool results + actual invocation inputs, not model/client assertions.
export const planningSourcesSchema = z.object({
  wedding: c.resultSchema(c.weddingData).optional(),
  tasks: z.object({ input: c.tasksInput, result: c.resultSchema(c.taskData) }).strict().optional(),
  vendors: z.object({ input: c.coupleVendorsInput, result: c.resultSchema(c.coupleVendorData) }).strict().optional(),
  budget: c.resultSchema(c.budgetData).optional(), payments: c.resultSchema(c.paymentData).optional(),
  guests: c.resultSchema(c.guestData).optional(), missing: c.resultSchema(c.missingData).optional(),
}).strict();
const phaseSchema = z.object({
  key: z.enum(["unknown_date", "before_wedding", "final_month", "wedding_week", "wedding_day", "post_wedding"]),
  daysRemaining: z.number().int().nonnegative().nullable(), daysSinceWedding: z.number().int().nonnegative().nullable(),
}).strict();
const bucket = z.enum(["immediate", "next_7_days", "next_30_days", "later", "undated"]);
const reason = z.enum(["task_overdue", "task_due", "task_undated", "payment_overdue", "payment_due", "payment_undated", "vendor_not_recorded_booked", "vendor_details_needed", "budget_overcommitted", "rsvp_pending", "invitations_pending"]);
const signalSchema = z.object({
  id: z.string().max(100), kind: z.literal("DETERMINISTIC_SIGNAL"), reason, bucket, priority: c.priority,
  taskAction: z.enum(["follow_up", "complete_work"]).optional(),
  entityIds: z.array(c.id).max(60), category: planningCategory.optional(), count: c.money.optional(),
  basis: z.array(z.object({ tool: readToolName, evidenceClass: z.literal("COUPLE_DATA") }).strict()).min(1).max(3),
  priorityBasis: z.enum(["deadline", "stored_task_priority", "couple_priority", "explicit_request", "venue_dependency", "financial_state", "guest_responses"]),
}).strict();
const sourceState = z.enum(["success", "empty", "unavailable", "not_requested"]);
export const roadmapSchema = z.object({
  asOfDate: c.date, phase: phaseSchema, analysisOnly: z.literal(true),
  overallState: z.enum(["limited", "attention_signals", "no_signals_in_available_data"]),
  sourceStates: z.object({ wedding: sourceState, tasks: sourceState, vendors: sourceState, budget: sourceState, payments: sourceState, guests: sourceState, missing: sourceState }),
  sourceEvidence: z.record(z.enum(["wedding", "tasks", "vendors", "budget", "payments", "guests", "missing"]), z.array(c.toolEvidence).max(3)),
  facts: z.object({ wedding: c.weddingData.nullable(), tasks: c.taskData.nullable(), vendors: c.coupleVendorData.nullable(), budget: c.budgetData.nullable(), payments: c.paymentData.nullable(), guests: c.guestData.nullable(), missing: c.missingData.nullable() }),
  limitations: z.array(z.string().max(80)).max(30), signals: z.array(signalSchema).max(150),
  roadmap: z.array(z.object({ window: bucket, signalIds: z.array(z.string().max(100)).max(20), omitted: c.money }).strict()).max(5),
  requestedHorizonDays: z.number().int().min(1).max(30),
  vendorGaps: z.array(z.object({ category: planningCategory, state: z.enum(BOOKING_STATES), priority: c.priority }).strict()).max(12),
  futureInterpretation: z.literal("AI_RECOMMENDATION"), externalEvidence: z.literal("not_available"),
}).strict();
export function weddingPhase(weddingDate: string | null, now = new Date()) {
  const phase = getWeddingPhase(weddingDate, now);
  const keys = { NO_DATE: "unknown_date", POST_WEDDING: "post_wedding", WEDDING_DAY: "wedding_day", FINAL_WEEK: "wedding_week", DAY_BEFORE: "wedding_week", NORMAL: phase.daysRemaining! <= 30 ? "final_month" : "before_wedding" };
  return phaseSchema.parse({ ...phase, key: keys[phase.key] });
}
export function buildPlanningState(rawSources: unknown, rawRequest: unknown = {}, now = new Date()) {
  const sources = planningSourcesSchema.parse(rawSources);
  const request = planningRequestSchema.parse(rawRequest);
  const results = { wedding: sources.wedding, tasks: sources.tasks?.result, vendors: sources.vendors?.result, budget: sources.budget, payments: sources.payments, guests: sources.guests, missing: sources.missing };
  const data = <T>(value: { status: string; data?: T } | undefined): T | null => value && (value.status === "success" || value.status === "empty") ? value.data ?? null : null;
  const facts = { wedding: data(sources.wedding), tasks: data(sources.tasks?.result), vendors: data(sources.vendors?.result), budget: data(sources.budget), payments: data(sources.payments), guests: data(sources.guests), missing: data(sources.missing) };
  const asOfDate = israelCalendarDate(now), today = new Date(`${asOfDate}T00:00:00Z`);
  const phase = weddingPhase(facts.wedding?.weddingDate ?? null, now);
  const limitations = Object.entries(results).filter(([, value]) => !value || value.status === "unavailable").map(([key, value]) => `${key}_${value ? "unavailable" : "not_requested"}`);
  if (phase.key === "unknown_date") limitations.push("date_guidance_limited");
  const taskInput = sources.tasks?.input, vendorInput = sources.vendors?.input;
  if ((facts.tasks && (facts.tasks.pagination.page !== taskInput?.page || facts.tasks.pagination.limit !== taskInput?.limit)) || (facts.vendors && (facts.vendors.pagination.page !== vendorInput?.page || facts.vendors.pagination.limit !== vendorInput?.limit))) throw new Error("Planning pagination must match the actual invocation.");
  if (facts.tasks && (facts.tasks.pagination.hasMore || facts.tasks.pagination.page !== 1 || taskInput?.priority || taskInput?.status || !["all", "open"].includes(taskInput?.view ?? ""))) limitations.push("tasks_partial_selection");
  const completeVendors = Boolean(facts.vendors && facts.vendors.pagination.page === 1 && !facts.vendors.pagination.hasMore && vendorInput && !vendorInput.category && !vendorInput.source && vendorInput.saved == null && !vendorInput.lifecycle);
  if (facts.vendors && !completeVendors) limitations.push("vendors_partial_selection");
  if (facts.payments && Object.values(facts.payments.hasMore).some(Boolean)) limitations.push("payments_partial_selection");
  if (facts.missing?.fields.length) limitations.push("wedding_details_missing");
  // Date-labelled snapshots cannot silently be reused as current evidence on another day.
  if ((facts.tasks && facts.tasks.asOfDate !== asOfDate) || (facts.payments && facts.payments.asOfDate !== asOfDate)) throw new Error("Planning requires fresh dated tool results.");
  const signals: z.output<typeof signalSchema>[] = [];
  const windowFor = (due: string | null): z.output<typeof bucket> => {
    if (!due) return "undated";
    const days = calendarDayDifference(due, today);
    return days <= 0 ? "immediate" : days <= Math.min(7, request.horizonDays) ? "next_7_days" : days <= request.horizonDays ? "next_30_days" : "later";
  };
  const basis = (tool: z.output<typeof readToolName>) => [{ tool, evidenceClass: "COUPLE_DATA" as const }];
  for (const task of facts.tasks?.tasks ?? []) {
    if (task.status === "completed") continue;
    const overdue = Boolean(task.dueDate && task.dueDate < asOfDate);
    signals.push({ id: `task:${task.id}`, taskAction: task.status === "waiting_on_vendor" ? "follow_up" : "complete_work", kind: "DETERMINISTIC_SIGNAL", reason: overdue ? "task_overdue" : task.dueDate ? "task_due" : "task_undated", bucket: windowFor(task.dueDate), priority: overdue ? "high" : task.priority, entityIds: [task.id], basis: basis("list_tasks"), priorityBasis: overdue ? "deadline" : "stored_task_priority" });
  }
  if (facts.payments) {
    const classified = classifyUnpaidPayments([...facts.payments.overdue, ...facts.payments.upcoming, ...facts.payments.undated], now);
    for (const group of ["overdue", "upcoming", "undated"] as const) for (const payment of classified[group]) {
      signals.push({ id: `payment:${payment.id}`, kind: "DETERMINISTIC_SIGNAL", reason: group === "overdue" ? "payment_overdue" : group === "upcoming" ? "payment_due" : "payment_undated", bucket: windowFor(payment.dueDate), priority: group === "overdue" || payment.dueDate === asOfDate ? "high" : "medium", entityIds: [payment.id], basis: basis("get_upcoming_payments"), priorityBasis: "deadline" });
    }
  }
  const desired = new Set<Category>(request.desiredCategories);
  const preferred = new Set<Category>((facts.wedding?.priorities ?? []).flatMap((value) => preferenceCategories[value] ? [preferenceCategories[value]] : []));
  if (facts.wedding) { desired.add("venue"); preferred.forEach((value) => desired.add(value)); }
  const vendorGaps = [...desired].sort().map((category) => {
    const booking = categoryBookingState(category, {
      relationships: (facts.vendors?.vendors ?? []).map(entry => ({ id: entry.relationshipId, status: entry.lifecycle, category: entry.vendor.category?.slug ?? null, subcategory: entry.vendor.subcategory?.slug ?? null })),
      declarations: facts.wedding?.bookedCategories ?? [], legacyVenueStatus: facts.wedding?.venueStatus,
      complete: completeVendors && Boolean(facts.wedding),
    });
    const state = booking.state;
    const important = category === "venue" || (preferred.has(category) && !request.lowerPriorityCategories.includes(category));
    const close = phase.daysRemaining != null && phase.daysRemaining <= 30 && phase.key !== "post_wedding";
    const priority = category !== "venue" && request.lowerPriorityCategories.includes(category) ? "low" as const : important && close ? "high" as const : "medium" as const;
    if (state === "NOT_RECORDED_AS_BOOKED" && phase.key !== "post_wedding") signals.push({ id: `vendor:${category}`, kind: "DETERMINISTIC_SIGNAL", reason: "vendor_not_recorded_booked", bucket: important && close ? "immediate" : "later", priority, category, entityIds: [], basis: [...basis("get_wedding_summary"), ...basis("get_couple_vendors")], priorityBasis: category === "venue" ? "venue_dependency" : preferred.has(category) ? "couple_priority" : "explicit_request" });
    if (state === "REPORTED_ARRANGED_DETAILS_LATER") signals.push({ id: `vendor-details:${category}`, kind: "DETERMINISTIC_SIGNAL", reason: "vendor_details_needed", bucket: "later", priority: "low", category, entityIds: [], basis: basis("get_wedding_summary"), priorityBasis: "explicit_request" });
    return { category, state, priority };
  });
  if (facts.budget?.availableMinor != null && facts.budget.availableMinor < 0) signals.push({ id: "budget:overcommitted", kind: "DETERMINISTIC_SIGNAL", reason: "budget_overcommitted", bucket: "immediate", priority: "high", entityIds: [], basis: basis("get_budget_summary"), priorityBasis: "financial_state" });
  if (facts.guests && ["final_month", "wedding_week", "wedding_day"].includes(phase.key)) {
    for (const [key, reason] of [["awaitingResponse", "rsvp_pending"], ["notYetInvited", "invitations_pending"]] as const) if (facts.guests[key] > 0) signals.push({ id: `guests:${key}`, kind: "DETERMINISTIC_SIGNAL", reason, bucket: "immediate", priority: "high", count: facts.guests[key], entityIds: [], basis: basis("get_guest_list_summary"), priorityBasis: "guest_responses" });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  signals.sort((a, b) => rank[a.priority] - rank[b.priority] || a.id.localeCompare(b.id));
  if (new Set(signals.map((signal) => signal.id)).size !== signals.length) throw new Error("Duplicate planning source records.");
  const windows = ["immediate", "next_7_days", "next_30_days", "later", "undated"] as const;
  if (vendorGaps.some((gap) => gap.state === "UNKNOWN_NEEDS_REVIEW")) limitations.push("vendor_gaps_unknown");
  return roadmapSchema.parse({ asOfDate, phase, facts, sourceStates: Object.fromEntries(Object.entries(results).map(([key, value]) => [key, value?.status ?? "not_requested"])),
    sourceEvidence: Object.fromEntries(Object.entries(results).map(([key, value]) => [key, value?.evidence ?? []])), limitations,
    overallState: limitations.length ? "limited" : signals.length ? "attention_signals" : "no_signals_in_available_data", signals, vendorGaps,
    roadmap: windows.map((window) => { const selected = signals.filter((signal) => signal.bucket === window); return { window, signalIds: selected.slice(0, 20).map((signal) => signal.id), omitted: Math.max(0, selected.length - 20) }; }),
    requestedHorizonDays: request.horizonDays, analysisOnly: true, futureInterpretation: "AI_RECOMMENDATION", externalEvidence: "not_available" });
}
