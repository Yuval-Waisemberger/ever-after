import { describe, expect, it } from "vitest";
import { isWeddingSetupComplete } from "@/lib/domain/wedding-setup";

const complete = {
  venueStatus: "looking",
  venueName: null,
  guestCount: 240,
  preferredArea: "central_israel",
  eventType: "evening",
  styles: ["Romantic"],
  priorities: ["Photography"],
};

describe("Wedding Setup completion", () => {
  it("treats date and budget as optional", () => {
    expect(isWeddingSetupComplete(complete)).toBe(true);
  });

  it("keeps the completion prompt for partial preferences", () => {
    expect(isWeddingSetupComplete({ ...complete, styles: [] })).toBe(false);
  });

  it("requires a name only when a venue is booked", () => {
    expect(isWeddingSetupComplete({ ...complete, venueStatus: "booked" })).toBe(false);
    expect(isWeddingSetupComplete({ ...complete, venueStatus: "booked", venueName: "Ein Kerem Terrace" })).toBe(true);
  });
});
