import { describe, expect, it } from "vitest";
import { guestSchema } from "@/lib/validation/guest";

const valid = { fullName: "Cohen Family", invitedCount: "5", rsvpStatus: "invited" };

describe("Guest validation", () => {
  it("rejects whitespace-only names and invalid optional email", () => {
    expect(guestSchema.safeParse({ ...valid, fullName: " \t\n " }).success).toBe(false);
    expect(guestSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("normalizes optional blanks and awaiting attendance to null", () => {
    const parsed = guestSchema.parse({ ...valid, partyName: "  ", phone: "", email: "", attendingCount: "" });
    expect(parsed).toMatchObject({ partyName: null, phone: null, email: null, attendingCount: null });
  });

  it("supports partial attendance", () => {
    expect(guestSchema.parse({ ...valid, rsvpStatus: "attending", attendingCount: "3" })).toMatchObject({ invitedCount: 5, attendingCount: 3 });
  });

  it("rejects missing, excessive, negative, and non-integer attendance", () => {
    for (const attendingCount of ["", "6", "-1", "2.5"]) {
      expect(guestSchema.safeParse({ ...valid, rsvpStatus: "attending", attendingCount }).success).toBe(false);
    }
  });

  it("normalizes declined attendance to zero", () => {
    expect(guestSchema.parse({ ...valid, rsvpStatus: "not_attending" }).attendingCount).toBe(0);
    expect(guestSchema.safeParse({ ...valid, rsvpStatus: "not_attending", attendingCount: "1" }).success).toBe(false);
  });

  it("rejects attendance counts for not-invited and awaiting-response rows", () => {
    expect(guestSchema.safeParse({ ...valid, rsvpStatus: "not_invited", attendingCount: "1" }).success).toBe(false);
    expect(guestSchema.safeParse({ ...valid, rsvpStatus: "invited", attendingCount: "1" }).success).toBe(false);
  });

  it("enforces database-aligned count and text limits", () => {
    expect(guestSchema.safeParse({ ...valid, invitedCount: "0" }).success).toBe(false);
    expect(guestSchema.safeParse({ ...valid, invitedCount: "21" }).success).toBe(false);
    expect(guestSchema.safeParse({ ...valid, guestGroup: "x".repeat(81) }).success).toBe(false);
    expect(guestSchema.safeParse({ ...valid, privateNotes: "x".repeat(3001) }).success).toBe(false);
  });
});
