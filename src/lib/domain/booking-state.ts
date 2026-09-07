// Exact Setup labels and real Marketplace taxonomy. Never match free-text names.
export const BOOKING_CATEGORIES = [
  { key: "venue", label: "Venue", category: "venues", subcategories: ["wedding-venues"] },
  { key: "photographer", label: "Photographer", category: "photography-content", subcategories: ["wedding-photographers"] },
  { key: "videographer", label: "Videographer", category: "photography-content", subcategories: ["videographers"] },
  { key: "dj", label: "DJ", category: "music-entertainment", subcategories: ["djs"] },
  { key: "dress", label: "Wedding dress", category: "beauty-attire", subcategories: ["wedding-dresses"] },
  { key: "suit", label: "Suit", category: "beauty-attire", subcategories: ["suits"] },
  { key: "makeup", label: "Makeup and hair", category: "beauty-attire", subcategories: ["makeup-hair"] },
  { key: "design", label: "Event design", category: "design-flowers", subcategories: ["event-design"] },
  { key: "flowers", label: "Flowers", category: "design-flowers", subcategories: ["flowers"] },
  { key: "officiant", label: "Rabbi / officiant", category: "event-services", subcategories: ["officiants"] },
  { key: "manager", label: "Event manager", category: "event-services", subcategories: ["event-managers"] },
  { key: "transportation", label: "Transportation", category: "event-services", subcategories: ["transportation"] },
  { key: "other", label: "Other", category: null, subcategories: [] },
] as const;
export type BookingCategory = typeof BOOKING_CATEGORIES[number]["key"];
export const BOOKING_STATES = ["CONFIRMED_BOOKED", "REPORTED_ARRANGED_DETAILS_LATER", "NOT_RECORDED_AS_BOOKED", "UNKNOWN_NEEDS_REVIEW"] as const;
export type BookingRelationship = { id: string; status: string | null; category: string | null; subcategory: string | null; businessName?: string };
export function matchesBookingCategory(key: BookingCategory, vendor: Pick<BookingRelationship, "category" | "subcategory">) {
  const mapping = BOOKING_CATEGORIES.find(c => c.key === key)!;
  return Boolean(mapping.category && vendor.category === mapping.category &&
    (mapping.subcategories.some(s => s === vendor.subcategory) || (key === "venue" && !vendor.subcategory)));
}
export function categoryBookingState(key: BookingCategory, input: {
  relationships: readonly BookingRelationship[]; declarations: readonly string[]; complete: boolean;
  legacyVenueStatus?: string | null;
}) {
  const category = BOOKING_CATEGORIES.find(c => c.key === key)!;
  const matching = input.relationships.filter(v => matchesBookingCategory(key, v));
  const confirmed = matching.filter(v => v.status === "booked");
  const declared = input.declarations.includes(category.label) || (key === "venue" && input.legacyVenueStatus === "booked");
  const conflict = declared && matching.some(v => v.status !== "booked");
  const unmapped = input.relationships.some(v => v.status === "booked" && (!v.category || !v.subcategory));
  const state: typeof BOOKING_STATES[number] = confirmed.length ? "CONFIRMED_BOOKED"
    : !input.complete || conflict ? "UNKNOWN_NEEDS_REVIEW"
    : declared ? "REPORTED_ARRANGED_DETAILS_LATER"
    : unmapped || key === "other" ? "UNKNOWN_NEEDS_REVIEW" : "NOT_RECORDED_AS_BOOKED";
  return { category: key, state, declared, confirmedIds: confirmed.map(v => v.id), needsReview: conflict || (confirmed.length > 0 && declared) };
}
