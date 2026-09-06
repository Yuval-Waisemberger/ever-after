import { describe, expect, it } from "vitest";
import { calculateGuestSummary, guestSideLabels } from "@/lib/domain/guests";

describe("Guest List domain", () => {
  it("calculates invitation and RSVP headcounts, including partial attendance", () => {
    const summary = calculateGuestSummary([
      { rsvpStatus: "not_invited", invitedCount: 4, attendingCount: null },
      { rsvpStatus: "invited", invitedCount: 3, attendingCount: null },
      { rsvpStatus: "attending", invitedCount: 5, attendingCount: 3 },
      { rsvpStatus: "not_attending", invitedCount: 2, attendingCount: 0 },
    ]);

    expect(summary).toEqual({
      invitationParties: 4,
      invited: 10,
      attending: 3,
      awaitingResponse: 3,
      notAttending: 4,
      notYetInvited: 4,
    });
  });

  it("uses real partner names and graceful fallbacks for canonical sides", () => {
    expect(guestSideLabels("Omer", "Liad")).toEqual({ partner_one: "Omer’s side", partner_two: "Liad’s side", both: "Both" });
    expect(guestSideLabels("", null)).toEqual({ partner_one: "First partner’s side", partner_two: "Second partner’s side", both: "Both" });
  });
});
