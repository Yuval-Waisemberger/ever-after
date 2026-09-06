import { describe, expect, it } from "vitest";
import {
  countSaved,
  lifecycleFromStoredStatus,
  shouldDeleteAfterUnsave,
  storedStatusFromLifecycle,
  type RelationshipRetention,
} from "@/lib/domain/couple-vendors";

const emptyBookmark: RelationshipRetention = {
  status: "saved",
  agreedPriceMinor: null,
  privateNotes: null,
  contactOverride: null,
  paymentReference: null,
  externalVendorId: null,
  hasBudgetItem: false,
};

describe("independent saved-vendor state", () => {
  it("treats legacy saved as no active lifecycle and keeps other lifecycle values", () => {
    expect(lifecycleFromStoredStatus("saved")).toBeNull();
    expect(lifecycleFromStoredStatus("booked")).toBe("booked");
    expect(lifecycleFromStoredStatus("considering")).toBe("considering");
    expect(storedStatusFromLifecycle(null)).toBe("saved");
  });

  it("counts bookmarks exclusively from is_saved", () => {
    expect(countSaved([
      { is_saved: true, status: "booked" },
      { is_saved: false, status: "saved" },
      { is_saved: true, status: "considering" },
    ])).toBe(2);
  });

  it("deletes only an empty Marketplace bookmark placeholder after unsave", () => {
    expect(shouldDeleteAfterUnsave(emptyBookmark)).toBe(true);
    expect(shouldDeleteAfterUnsave({ ...emptyBookmark, status: "booked" })).toBe(false);
    expect(shouldDeleteAfterUnsave({ ...emptyBookmark, status: "considering" })).toBe(false);
    expect(shouldDeleteAfterUnsave({ ...emptyBookmark, privateNotes: "Call next week" })).toBe(false);
    expect(shouldDeleteAfterUnsave({ ...emptyBookmark, agreedPriceMinor: 500_000 })).toBe(false);
    expect(shouldDeleteAfterUnsave({ ...emptyBookmark, hasBudgetItem: true })).toBe(false);
    expect(shouldDeleteAfterUnsave({ ...emptyBookmark, externalVendorId: "external-id" })).toBe(false);
  });
});
