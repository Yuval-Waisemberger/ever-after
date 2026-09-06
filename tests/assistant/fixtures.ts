import type { AssistantContext, AssistantVendor } from "@/lib/assistant/types";

export function assistantVendor(overrides: Partial<AssistantVendor> = {}): AssistantVendor {
  return {
    id: "vendor-id", businessName: "Vendor", source: "marketplace",
    isSaved: false, lifecycleStatus: null, agreedPriceMinor: null,
    minPriceMinor: null, maxPriceMinor: null, services: [], styles: [], serviceAreas: [], eventTypes: [],
    minGuestCapacity: null, maxGuestCapacity: null, ratingAverage: null, ...overrides,
  };
}

export function assistantContext(): AssistantContext {
  return {
    wedding: { weddingDate: null, guestCount: 250, preferredArea: "central_israel", eventType: null, styles: ["Romantic"], priorities: ["Photography"], totalBudgetMinor: 18_000_000, setupStatus: "completed" },
    tasks: [{ id: "1", title: "Call the DJ", dueDate: null, status: "open", priority: "medium" }],
    guestList: { invited: 8, attending: 3, awaitingResponse: 3, notAttending: 2, notYetInvited: 4 },
    vendors: [],
    budget: { committedMinor: 1_200_000, paidMinor: 300_000, availableMinor: 16_800_000, unpaidPayments: [] },
  };
}
