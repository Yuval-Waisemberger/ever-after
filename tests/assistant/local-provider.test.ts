import { describe, expect, it } from "vitest";
import { LocalWeddingAssistantProvider } from "@/lib/assistant/local-provider";
import type { AssistantContext, AssistantVendor } from "@/lib/assistant/types";

function assistantVendor(overrides: Partial<AssistantVendor>): AssistantVendor {
  return {
    id: "vendor-id",
    slug: "vendor",
    businessName: "Vendor",
    description: null,
    categorySlug: "photography-content",
    categoryName: "Photography & Content",
    subcategorySlug: null,
    subcategoryName: null,
    locationCity: null,
    serviceAreas: [],
    minPriceMinor: null,
    maxPriceMinor: null,
    services: [],
    styles: [],
    eventTypes: [],
    minGuestCapacity: null,
    maxGuestCapacity: null,
    fridayAvailable: null,
    phone: null,
    email: null,
    websiteUrl: null,
    instagramUrl: null,
    imageUrl: null,
    imageAlt: "",
    gallery: [],
    ratingAverage: null,
    reviewCount: 0,
    reviews: [],
    recommendation: null,
    source: "marketplace",
    isSaved: false,
    lifecycleStatus: null,
    agreedPriceMinor: null,
    privateNotes: null,
    ...overrides,
  };
}

const context: AssistantContext = {
  wedding: { weddingDate: null, guestCount: 250, preferredArea: "central_israel", eventType: null, styles: ["Romantic"], priorities: ["Photography"], totalBudgetMinor: 18_000_000, setupStatus: "completed" },
  tasks: [{ id: "1", title: "Call the DJ", dueDate: null, status: "open", priority: "medium" }],
  guestList: { invited: 8, attending: 3, awaitingResponse: 3, notAttending: 2, notYetInvited: 4 },
  vendors: [],
  budget: { committedMinor: 1_200_000, paidMinor: 300_000, availableMinor: 16_800_000, upcomingPayments: [] },
};

describe("local assistant provider", () => {
  const provider = new LocalWeddingAssistantProvider();

  it("answers account questions from Couple data", async () => {
    const response = await provider.respond({ message: "What tasks do we still need to do?", context });
    expect(response.text).toContain("1 open task");
    expect(response.sources).toEqual(["Couple data"]);
  });

  it("does not fabricate current research", async () => {
    const response = await provider.respond({ message: "What are the current legal requirements?", context });
    expect(response.text).toContain("Web research is not configured");
    expect(response.sources).not.toContain("Web research");
  });

  it("uses privacy-preserving Guest List aggregates", async () => {
    const response = await provider.respond({ message: "How are our guest RSVPs looking?", context });
    expect(response.text).toContain("8 invited");
    expect(response.text).toContain("3 attending");
    expect(response.text).not.toContain("name");
    expect(response.sources).toEqual(["Couple data"]);
  });

  it("keeps general invitation wording guidance separate from Guest List totals", async () => {
    const response = await provider.respond({ message: "What invitation wording should we include?", context });
    expect(response.text).toContain("couple’s names");
    expect(response.text).not.toContain("8 invited");
    expect(response.sources).toEqual(["General guidance"]);
  });

  it("uses independent Saved and lifecycle state for comparisons and bookings", async () => {
    const withVendors: AssistantContext = {
      ...context,
      vendors: [
        assistantVendor({ id: "one", businessName: "Saved Studio", isSaved: true }),
        assistantVendor({ id: "two", businessName: "Considering Studio", lifecycleStatus: "considering" }),
        assistantVendor({ id: "three", businessName: "External Quartet", source: "external", lifecycleStatus: "booked", isSaved: false }),
      ],
    };
    const comparison = await provider.respond({ message: "Compare the vendors", context: withVendors });
    expect(comparison.text).toContain("Saved Studio");
    expect(comparison.text).toContain("Considering Studio");
    const booked = await provider.respond({ message: "Which vendors are booked?", context: withVendors });
    expect(booked.text).toContain("External Quartet");
  });
});
