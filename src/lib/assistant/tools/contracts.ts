import { BOOKING_CATEGORIES, BOOKING_STATES } from "@/lib/domain/booking-state";
import { z } from "zod";
import { contextSectionSchema } from "../evidence";

export const LIMITS = { tasks: 50, vendors: 20, comparisons: 4, paymentsPerGroup: 20, aggregateRows: 10000, relationshipRows: 1000, reviewRows: 5000, batch: 500 } as const;
export const MARKETPLACE_SCAN = { chunk: 50, maxCandidates: 1000 } as const;
export const id = z.uuid();
export const text = z.string().max(160);
export const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const dbMoney = z.union([money, z.string().regex(/^\d+$/).transform(Number).pipe(money)]);
export const date = z.iso.date();
export const area = z.enum(["central_israel", "sharon", "north", "jerusalem", "south", "flexible"]);
export const eventType = z.enum(["evening", "friday_afternoon", "daytime", "undecided"]);
export const slug = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);
export const status = z.enum(["open", "in_progress", "completed"]);
export const priority = z.enum(["low", "medium", "high"]);
export const lifecycle = z.enum(["contacted", "considering", "booked", "rejected"]);
const page = z.number().int().min(1).max(1000).default(1);
const vendorLimit = z.number().int().min(1).max(LIMITS.vendors).default(12);
const taskLimit = z.number().int().min(1).max(LIMITS.tasks).default(25);
export const noInput = z.object({}).strict();
export const tasksInput = z.object({ page, limit: taskLimit, view: z.enum(["all", "open", "completed", "overdue", "due_soon"]).default("all"), status: status.optional(), priority: priority.optional() }).strict();
export const timelineInput = z.object({ page, limit: taskLimit, includeCompleted: z.boolean().default(false) }).strict();
export const paymentsInput = z.object({ limitPerGroup: z.number().int().min(1).max(LIMITS.paymentsPerGroup).default(10) }).strict();
export const coupleVendorsInput = z.object({ page, limit: vendorLimit, saved: z.boolean().optional(), lifecycle: lifecycle.optional(), source: z.enum(["marketplace", "external"]).optional(), category: slug.optional() }).strict();
export const marketplaceInput = z.object({
  page, limit: vendorLimit, search: z.string().trim().min(1).max(100).optional(), category: slug.optional(), subcategory: slug.optional(),
  city: z.string().trim().min(1).max(100).optional(), area: area.optional(),
  minPriceMinor: money.optional(), maxPriceMinor: money.optional(), style: z.string().min(1).max(100).optional(),
  eventType: eventType.optional(), guestCount: z.number().int().min(1).max(500000).optional(),
  minRating: z.number().min(1).max(5).optional(), fridayAvailable: z.boolean().optional(),
}).strict().refine((input) => input.minPriceMinor == null || input.maxPriceMinor == null || input.minPriceMinor <= input.maxPriceMinor, "Minimum price must not exceed maximum price.");
export const compareInput = z.object({ vendorIds: z.array(id).min(2).max(LIMITS.comparisons).refine((ids) => new Set(ids).size === ids.length, "Choose distinct vendors.") }).strict();

// Output allowlists strip extra properties at every nested object. No raw row is returned.
export const weddingData = z.object({
  bookingStates: z.array(z.object({ category: z.enum(BOOKING_CATEGORIES.map(c => c.key)), state: z.enum(BOOKING_STATES), declared: z.boolean(), confirmedIds: z.array(id).max(200), needsReview: z.boolean() })).max(13).optional(),
  weddingDate: date.nullable(), guestCount: z.number().int().min(1).max(5000).nullable(), preferredArea: area.nullable(), eventType: eventType.nullable(),
  styles: z.array(text).max(20), priorities: z.array(text).max(20), totalBudgetMinor: money.nullable(),
  setupStatus: z.enum(["not_started", "skipped", "completed"]), venueStatus: z.enum(["booked", "not_yet", "looking"]).nullable(),
  venueName: text.nullable(), bookedCategories: z.array(text).max(20).describe("Couple-reported arrangements awaiting vendor details, never confirmed vendor bookings"),
});
export const task = z.object({ id, title: text, category: text.nullable(), dueDate: date.nullable(), priority, status });
export const pagination = z.object({ page: z.number().int().positive(), limit: z.number().int().positive().max(50), hasMore: z.boolean() });
export const taskData = z.object({ tasks: z.array(task).max(LIMITS.tasks), pagination, asOfDate: date });
export const timelineData = z.object({
  weddingDate: date.nullable(), asOfDate: date, pagination,
  groups: z.array(z.object({ key: z.enum(["overdue", "due_soon", "upcoming", "later", "completed"]), tasks: z.array(task.extend({ relativeTiming: z.object({ key: text, label: text }).nullable() })).max(LIMITS.tasks) })).max(5),
}).refine((value) => value.groups.reduce((sum, group) => sum + group.tasks.length, 0) <= LIMITS.tasks);
export const budgetData = z.object({
  totalBudgetMinor: money.nullable(), projectedMinor: money, committedMinor: money, paidMinor: money,
  availableMinor: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).nullable(), remainingCommittedMinor: money,
});
export const payment = z.object({ id, label: text, amountMinor: money, dueDate: date.nullable(), expenseLabel: text, category: text.nullable() });
export const paymentData = z.object({
  overdue: z.array(payment).max(LIMITS.paymentsPerGroup), upcoming: z.array(payment).max(LIMITS.paymentsPerGroup), undated: z.array(payment).max(LIMITS.paymentsPerGroup),
  hasMore: z.object({ overdue: z.boolean(), upcoming: z.boolean(), undated: z.boolean() }), asOfDate: date,
});
export const taxonomy = z.object({ slug, name: text }).nullable();
export const vendorFacts = z.object({
  id, businessName: z.string().max(120), category: taxonomy, subcategory: taxonomy, locationCity: z.string().max(100).nullable(),
  serviceAreas: z.array(text).max(20), minPriceMinor: money.nullable(), maxPriceMinor: money.nullable(),
  services: z.array(z.string().max(100)).max(40), styles: z.array(z.string().max(100)).max(20), eventTypes: z.array(text).max(20),
  minGuestCapacity: z.number().int().positive().nullable(), maxGuestCapacity: z.number().int().positive().nullable(), fridayAvailable: z.boolean().nullable(),
  ratingAverage: z.number().min(1).max(5).nullable(), reviewCount: z.number().int().nonnegative(),
});
export const externalFacts = z.object({ id, businessName: z.string().max(120), category: taxonomy, subcategory: taxonomy });
export const coupleVendor = z.object({
  relationshipId: id, saved: z.boolean(), lifecycle: lifecycle.nullable(), agreedPriceMinor: money.nullable(),
  vendor: z.discriminatedUnion("source", [vendorFacts.extend({ source: z.literal("marketplace") }), externalFacts.extend({ source: z.literal("external") })]),
});
export const coupleVendorData = z.object({ vendors: z.array(coupleVendor).max(LIMITS.vendors), pagination });
export const marketplaceData = z.object({ vendors: z.array(vendorFacts).max(LIMITS.vendors), pagination, paginationBasis: z.literal("filtered_results"), marketScope: z.literal("ever_after_marketplace_only") });
const dimension = z.enum(["area", "budget", "style", "capacity", "eventType", "rating"]);
export const recommendation = z.object({
  score: z.number().min(0).max(100).nullable(), isRecommended: z.boolean(), applicableDimensions: z.array(dimension).max(6),
  reasons: z.array(z.object({ dimension, label: text, earnedWeight: z.number().nonnegative(), availableWeight: z.number().nonnegative() })).max(6),
});
export const comparisonData = z.object({
  vendors: z.array(z.object({ vendor: vendorFacts, recommendation, missingEvidence: z.array(dimension).max(6), scoreStatus: z.enum(["calculated", "insufficient_evidence"]) })).max(LIMITS.comparisons),
  missingVendorIds: z.array(id).max(LIMITS.comparisons),
  matchContext: z.object({ preferredArea: area.nullable(), availableBudgetMinor: budgetData.shape.availableMinor, styles: z.array(text).max(20), guestCount: weddingData.shape.guestCount, eventType: eventType.nullable() }),
  marketScope: z.literal("ever_after_marketplace_only"),
});
export const guestData = z.object({ invited: money, attending: money, awaitingResponse: money, notAttending: money, notYetInvited: money });
export const missingData = z.object({
  fields: z.array(z.object({ field: z.enum(["weddingDate", "guestCount", "preferredArea", "eventType", "styles", "priorities", "totalBudgetMinor", "venueStatus", "venueName"]), limits: z.array(z.enum(["roadmap", "budget_advice", "vendor_recommendations", "timeline_advice"])).max(4) })).max(9),
  setupStatus: weddingData.shape.setupStatus, setupComplete: z.boolean(),
});

// Empty Marketplace pages still have Marketplace provenance, with no vendor IDs.
export const toolEvidence = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("COUPLE_DATA"), section: contextSectionSchema }),
  z.object({ kind: z.literal("MARKETPLACE_DATA"), vendorIds: z.array(id).max(LIMITS.vendors), marketScope: z.literal("ever_after_marketplace_only") }),
]);
export type ToolEvidence = z.output<typeof toolEvidence>;
export const errorCode = z.enum(["UNKNOWN_TOOL", "INVALID_INPUT", "NOT_AUTHORIZED", "SOURCE_UNAVAILABLE", "INVALID_SOURCE_DATA", "READ_LIMIT_EXCEEDED"]);
export const unavailableSchema = z.object({ status: z.literal("unavailable"), error: z.object({ code: errorCode, message: z.string().max(200), retryable: z.boolean() }), evidence: z.array(toolEvidence).length(0) });
export function resultSchema<T extends z.ZodType>(data: T) {
  const shape = { data, evidence: z.array(toolEvidence).min(1).max(3) };
  return z.discriminatedUnion("status", [z.object({ status: z.literal("success"), ...shape }), z.object({ status: z.literal("empty"), ...shape }), unavailableSchema]);
}
export type ReadOutcome<T> = { data: T; empty: boolean; evidence: ToolEvidence[] };
