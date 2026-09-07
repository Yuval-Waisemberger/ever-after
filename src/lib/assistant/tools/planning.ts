import { BOOKING_CATEGORIES, categoryBookingState } from "@/lib/domain/booking-state";
import { readBookingRelationships } from "@/lib/queries/booking-relationships";
import { z } from "zod";
import { calculateBudgetSummary, isPaymentScheduleActive } from "@/lib/domain/budget";
import { calculateGuestSummary, GUEST_RSVP_STATUSES } from "@/lib/domain/guests";
import { calendarDayDifference } from "@/lib/domain/date-status";
import { relativeTimelineLabel } from "@/lib/domain/timeline";
import { isWeddingSetupComplete } from "@/lib/domain/wedding-setup";
import { classifyUnpaidPayments } from "../payments";
import * as c from "./contracts";
import { allRows, coupleEvidence, defineReadTool, one, rows, ToolReadError, type ToolContext } from "./server";

const weddingColumns = "wedding_date, guest_count, preferred_area, event_type, styles, priorities, total_budget_minor, setup_status, venue_status, venue_name, booked_categories";
const weddingRow = z.object({
  wedding_date: c.weddingData.shape.weddingDate, guest_count: c.weddingData.shape.guestCount, preferred_area: c.weddingData.shape.preferredArea,
  event_type: c.weddingData.shape.eventType, styles: c.weddingData.shape.styles, priorities: c.weddingData.shape.priorities,
  total_budget_minor: c.dbMoney.nullable(), setup_status: c.weddingData.shape.setupStatus,
  venue_status: c.weddingData.shape.venueStatus, venue_name: c.weddingData.shape.venueName, booked_categories: c.weddingData.shape.bookedCategories,
});
export async function readWedding(context: ToolContext) {
  const row = await one(context.db.from("weddings").select(weddingColumns).eq("id", context.weddingId).single(), weddingRow);
  const bookings = await readBookingRelationships(context.db, context.weddingId);
  return c.weddingData.parse({ bookingStates: BOOKING_CATEGORIES.map(c => categoryBookingState(c.key, { ...bookings, declarations: row.booked_categories, legacyVenueStatus: row.venue_status })), weddingDate: row.wedding_date, guestCount: row.guest_count, preferredArea: row.preferred_area, eventType: row.event_type,
    styles: row.styles, priorities: row.priorities, totalBudgetMinor: row.total_budget_minor, setupStatus: row.setup_status,
    venueStatus: row.venue_status, venueName: row.venue_name, bookedCategories: row.booked_categories });
}
export const getWeddingSummary = defineReadTool("get_wedding_summary", "Read owned wedding planning details, with missing fields left unknown.", c.noInput, c.weddingData, async (_, context) => ({ data: await readWedding(context), empty: false, evidence: [coupleEvidence("wedding")] }));

const taskColumns = "id, title, category, due_date, priority, status";
const taskRow = z.object({ id: c.id, title: c.text, category: c.text.nullable(), due_date: c.date.nullable(), priority: c.priority, status: c.status });
function taskValue(row: z.output<typeof taskRow>) { return { id: row.id, title: row.title, category: row.category, dueDate: row.due_date, priority: row.priority, status: row.status }; }
function dayAfter(today: string, days: number) { return new Date(new Date(`${today}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10); }
export const listTasks = defineReadTool("list_tasks", "Read a bounded task page using deterministic status, priority and date filters.", c.tasksInput, c.taskData, async (input, context) => {
  let query = context.db.from("tasks").select(taskColumns).eq("wedding_id", context.weddingId);
  if (["open", "overdue", "due_soon"].includes(input.view)) query = query.neq("status", "completed");
  if (input.view === "completed") query = query.eq("status", "completed");
  if (input.view === "overdue") query = query.lt("due_date", context.today);
  if (input.view === "due_soon") query = query.gte("due_date", context.today).lte("due_date", dayAfter(context.today, 7));
  if (input.status) query = query.eq("status", input.status);
  if (input.priority) query = query.eq("priority", input.priority);
  const from = (input.page - 1) * input.limit;
  const found = await rows(query.order("due_date", { nullsFirst: false }).order("id").range(from, from + input.limit), taskRow, input.limit + 1);
  const tasks = found.slice(0, input.limit).map(taskValue);
  return { data: { tasks, pagination: { page: input.page, limit: input.limit, hasMore: found.length > input.limit }, asOfDate: context.today }, empty: !tasks.length, evidence: [coupleEvidence("tasks")] };
});
export const getTimelineSummary = defineReadTool("get_timeline_summary", "Group a bounded page of existing dated tasks; no separate timeline records.", c.timelineInput, c.timelineData, async (input, context) => {
  const wedding = await one(context.db.from("weddings").select("wedding_date").eq("id", context.weddingId).single(), z.object({ wedding_date: c.date.nullable() }));
  let query = context.db.from("tasks").select(taskColumns).eq("wedding_id", context.weddingId).not("due_date", "is", null);
  if (!input.includeCompleted) query = query.neq("status", "completed");
  const from = (input.page - 1) * input.limit;
  const found = await rows(query.order("due_date").order("id").range(from, from + input.limit), taskRow, input.limit + 1);
  const today = new Date(`${context.today}T00:00:00Z`);
  const tasks = found.slice(0, input.limit).map(taskValue).map((task) => {
    const days = calendarDayDifference(task.dueDate!, today);
    return { ...task, bucket: task.status === "completed" ? "completed" : days < 0 ? "overdue" : days <= 7 ? "due_soon" : days <= 30 ? "upcoming" : "later",
      relativeTiming: wedding.wedding_date ? relativeTimelineLabel(task.dueDate!, wedding.wedding_date) : null };
  });
  const keys = ["overdue", "due_soon", "upcoming", "later", "completed"] as const;
  const groups = keys.map((key) => ({ key, tasks: tasks.filter((task) => task.bucket === key) })).filter((group) => group.tasks.length);
  return { data: { weddingDate: wedding.wedding_date, asOfDate: context.today, groups, pagination: { page: input.page, limit: input.limit, hasMore: found.length > input.limit } }, empty: !tasks.length, evidence: [coupleEvidence("tasks"), coupleEvidence("wedding")] };
});

const budgetRow = z.object({ id: c.id, estimated_amount_minor: c.dbMoney.nullable(), committed_amount_minor: c.dbMoney.nullable() });
const budgetPaymentRow = z.object({ budget_item_id: c.id, amount_minor: c.dbMoney, is_paid: z.boolean() });
export async function readBudget(context: ToolContext) {
  const [wedding, items, payments] = await Promise.all([
    one(context.db.from("weddings").select("total_budget_minor").eq("id", context.weddingId).single(), z.object({ total_budget_minor: c.dbMoney.nullable() })),
    allRows((from, to) => context.db.from("budget_items").select("id, estimated_amount_minor, committed_amount_minor").eq("wedding_id", context.weddingId).order("id").range(from, to), budgetRow, c.LIMITS.aggregateRows),
    allRows((from, to) => context.db.from("payments").select("budget_item_id, amount_minor, is_paid, budget_items!inner(wedding_id)").eq("budget_items.wedding_id", context.weddingId).order("id").range(from, to), budgetPaymentRow, c.LIMITS.aggregateRows),
  ]);
  const byItem = new Map(items.map((item) => [item.id, { estimatedAmountMinor: item.estimated_amount_minor, committedAmountMinor: item.committed_amount_minor, payments: [] as Array<{ amountMinor: number; isPaid: boolean }> }]));
  for (const payment of payments) {
    const item = byItem.get(payment.budget_item_id);
    if (!item) throw new ToolReadError("INVALID_SOURCE_DATA");
    item.payments.push({ amountMinor: payment.amount_minor, isPaid: payment.is_paid });
  }
  const data = c.budgetData.parse(calculateBudgetSummary(wedding.total_budget_minor, [...byItem.values()]));
  return { data, empty: !items.length && !payments.length && wedding.total_budget_minor == null, evidence: [coupleEvidence("budget")] };
}
export const getBudgetSummary = defineReadTool("get_budget_summary", "Read complete deterministic budget totals; incomplete aggregate reads are unavailable.", c.noInput, c.budgetData, (_, context) => readBudget(context));

const paymentRow = z.object({ id: c.id, label: c.text, amount_minor: c.dbMoney, due_date: c.date.nullable(), budget_items: z.object({ label: c.text, category: c.text.nullable(), source: z.enum(["manual", "booked_vendor"]), couple_vendors: z.object({ status: z.string() }).nullable() }) });
export const getUpcomingPayments = defineReadTool("get_upcoming_payments", "Read unpaid deadlines, bounded separately for overdue, upcoming and undated groups.", c.paymentsInput, c.paymentData, async (input, context) => {
  const keys = ["overdue", "upcoming", "undated"] as const;
  // Filter inactive booking schedules BEFORE bounded result selection/lookahead.
  // The internal scan has the existing aggregate cap; incomplete reads fail closed.
  const candidates = await allRows((from, to) => context.db.from("payments")
    .select("id, label, amount_minor, due_date, budget_items!inner(wedding_id, label, category, source, couple_vendors(status))")
    .eq("budget_items.wedding_id", context.weddingId).eq("is_paid", false)
    .order("due_date", { nullsFirst: false }).order("id").range(from, to), paymentRow, c.LIMITS.aggregateRows);
  const active = candidates.filter((row) => isPaymentScheduleActive({ source: row.budget_items.source, relationshipStatus: row.budget_items.couple_vendors?.status }));
  const batches = keys.map((group) => active.filter((row) => group === "undated" ? row.due_date == null
    : row.due_date != null && (group === "overdue" ? row.due_date < context.today : row.due_date >= context.today)));
  const selected = batches.flatMap((batch) => batch.slice(0, input.limitPerGroup)).map((row) => ({ id: row.id, label: row.label, amountMinor: row.amount_minor, dueDate: row.due_date, expenseLabel: row.budget_items.label, category: row.budget_items.category }));
  const classified = classifyUnpaidPayments(selected, context.now);
  return { data: { ...classified, hasMore: { overdue: batches[0].length > input.limitPerGroup, upcoming: batches[1].length > input.limitPerGroup, undated: batches[2].length > input.limitPerGroup }, asOfDate: context.today }, empty: !selected.length, evidence: [coupleEvidence("budget")] };
});

const guestRow = z.object({ rsvp_status: z.enum(GUEST_RSVP_STATUSES), invited_count: c.money, attending_count: c.money.nullable() });
export const getGuestListSummary = defineReadTool("get_guest_list_summary", "Read five aggregate Guest List counts. Never return individual guest data.", c.noInput, c.guestData, async (_, context) => {
  const guests = await allRows((from, to) => context.db.from("guests").select("rsvp_status, invited_count, attending_count").eq("wedding_id", context.weddingId).order("id").range(from, to), guestRow, c.LIMITS.aggregateRows);
  const summary = calculateGuestSummary(guests.map((row) => ({ rsvpStatus: row.rsvp_status, invitedCount: row.invited_count, attendingCount: row.attending_count })));
  return { data: c.guestData.parse(summary), empty: !guests.length, evidence: [coupleEvidence("guestList")] };
});
export const getMissingWeddingDetails = defineReadTool("get_missing_wedding_details", "Identify missing existing wedding fields and which planning advice they limit.", c.noInput, c.missingData, async (_, context) => {
  const wedding = await readWedding(context);
  const fields: z.output<typeof c.missingData>["fields"] = [];
  const add = (field: typeof fields[number]["field"], limits: typeof fields[number]["limits"]) => fields.push({ field, limits });
  if (!wedding.weddingDate) add("weddingDate", ["roadmap", "timeline_advice"]);
  if (wedding.guestCount == null) add("guestCount", ["budget_advice", "vendor_recommendations"]);
  if (!wedding.preferredArea) add("preferredArea", ["vendor_recommendations", "budget_advice"]);
  if (!wedding.eventType || wedding.eventType === "undecided") add("eventType", ["vendor_recommendations", "timeline_advice"]);
  if (!wedding.styles.length) add("styles", ["vendor_recommendations"]);
  if (!wedding.priorities.length) add("priorities", ["roadmap", "budget_advice"]);
  if (wedding.totalBudgetMinor == null) add("totalBudgetMinor", ["budget_advice", "vendor_recommendations"]);
  if (!wedding.venueStatus && !wedding.bookingStates?.some(s => s.category === "venue" && ["CONFIRMED_BOOKED", "REPORTED_ARRANGED_DETAILS_LATER"].includes(s.state))) add("venueStatus", ["roadmap", "timeline_advice"]);
  if (wedding.venueStatus === "booked" && !wedding.venueName) add("venueName", ["timeline_advice"]);
  return { data: { fields, setupStatus: wedding.setupStatus, setupComplete: isWeddingSetupComplete(wedding) }, empty: !fields.length, evidence: [coupleEvidence("wedding")] };
});
