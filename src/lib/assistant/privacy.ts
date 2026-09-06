import { z } from "zod";

const money = z.number().int().nonnegative();
const date = z.iso.date().nullable();

// Every nested object strips unknown properties. Never spread database rows into provider input.
// Free-text values remain untrusted data, not instructions; see AI_AGENT_SPEC.md for limitations.
export const assistantContextSchema = z.object({
  wedding: z.object({
    weddingDate: date, guestCount: z.number().int().nonnegative().nullable(),
    preferredArea: z.string().nullable(), eventType: z.string().nullable(),
    styles: z.array(z.string()), priorities: z.array(z.string()),
    totalBudgetMinor: money.nullable(), setupStatus: z.string(),
  }),
  tasks: z.array(z.object({
    id: z.string(), title: z.string(), dueDate: date,
    status: z.enum(["open", "in_progress", "completed"]), priority: z.enum(["low", "medium", "high"]),
  })),
  guestList: z.object({
    invited: money, attending: money, awaitingResponse: money, notAttending: money, notYetInvited: money,
  }),
  vendors: z.array(z.object({
    id: z.string(), businessName: z.string(), source: z.enum(["marketplace", "external"]),
    isSaved: z.boolean(), lifecycleStatus: z.enum(["contacted", "considering", "booked", "rejected"]).nullable(),
    agreedPriceMinor: money.nullable(), minPriceMinor: money.nullable(), maxPriceMinor: money.nullable(),
    services: z.array(z.string()), styles: z.array(z.string()), serviceAreas: z.array(z.string()), eventTypes: z.array(z.string()),
    minGuestCapacity: z.number().int().nonnegative().nullable(), maxGuestCapacity: z.number().int().nonnegative().nullable(),
    ratingAverage: z.number().min(1).max(5).nullable(),
  })),
  budget: z.object({
    committedMinor: money, paidMinor: money, availableMinor: z.number().int().nullable(),
    unpaidPayments: z.array(z.object({ amountMinor: money, dueDate: date })),
  }),
});
export function prepareAssistantContext(input: unknown) {
  return assistantContextSchema.parse(input);
}
