import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BOOKING_CATEGORIES, categoryBookingState, matchesBookingCategory } from "@/lib/domain/booking-state";
import { weddingSetupStatus } from "@/lib/domain/wedding-setup";
const vendor = { id: "one", status: "booked", category: "photography-content", subcategory: "wedding-photographers" };
describe("one booking semantics model", () => {
  it.each(BOOKING_CATEGORIES.filter(c => c.category))("maps $label to real seeded taxonomy exactly", c => {
    const seed = readFileSync("scripts/generate-marketplace-seed.mjs", "utf8");
    for (const slug of c.subcategories) {
      expect(seed).toMatch(new RegExp(`slug: "${slug}"[^\\n]+category: "${c.category}"`));
      expect(matchesBookingCategory(c.key, { category: c.category, subcategory: slug })).toBe(true);
    }
  });
  it("never invents an Other taxonomy or matches vendor names", () => {
    expect(matchesBookingCategory("other", vendor)).toBe(false);
    expect(matchesBookingCategory("photographer", { category: "photography-content", subcategory: "magnet-photographers" })).toBe(false);
  });
  it("allows multiple confirmed vendors regardless of declarations", () => {
    const state = categoryBookingState("photographer", { relationships: [vendor, { ...vendor, id: "two" }], declarations: ["Photographer"], complete: true });
    expect(state).toMatchObject({ state: "CONFIRMED_BOOKED", confirmedIds: ["one", "two"], needsReview: true });
  });
  it("distinguishes declarations, true empty and unavailable", () => {
    expect(categoryBookingState("photographer", { relationships: [], declarations: ["Photographer"], complete: true }).state).toBe("REPORTED_ARRANGED_DETAILS_LATER");
    expect(categoryBookingState("photographer", { relationships: [], declarations: [], complete: true }).state).toBe("NOT_RECORDED_AS_BOOKED");
    expect(categoryBookingState("photographer", { relationships: [], declarations: ["Photographer"], complete: false }).state).toBe("UNKNOWN_NEEDS_REVIEW");
  });
  it("never resurrects an unbooked vendor from a stale declaration; rebooking is real", () => {
    const input = { relationships: [{ ...vendor, status: "rejected" }], declarations: ["Photographer"], complete: true };
    expect(categoryBookingState("photographer", input)).toMatchObject({ state: "UNKNOWN_NEEDS_REVIEW", declared: true, confirmedIds: [] });
    input.relationships[0].status = "booked";
    expect(categoryBookingState("photographer", input).state).toBe("CONFIRMED_BOOKED");
  });
  it("a legacy venue name/status is only a declaration", () => {
    const input = { relationships: [], declarations: [], complete: true, legacyVenueStatus: "booked" };
    expect(categoryBookingState("venue", input).state).toBe("REPORTED_ARRANGED_DETAILS_LATER");
    expect(categoryBookingState("venue", { ...input, legacyVenueStatus: "looking" }).state).toBe("NOT_RECORDED_AS_BOOKED");
  });
  it("uses one completion rule for initial/returning saves without requiring vendors, date or budget", () => {
    const preferences = { venueStatus: null, venueName: null, guestCount: 200, preferredArea: "north", eventType: "evening", styles: ["Romantic"], priorities: ["Food"] };
    expect(weddingSetupStatus(preferences)).toBe("completed");
    expect(weddingSetupStatus({ ...preferences, guestCount: null })).toBe("skipped");
  });
});
