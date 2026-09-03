import { describe, expect, it } from "vitest";
import { calculateVendorProfileCompletion } from "@/lib/domain/vendor-profile";

describe("vendor profile completion", () => {
  it("is transparent and based on eight visible checks", () => {
    const result = calculateVendorProfileCompletion({ businessName: "Maya", description: "Story-led photos", imageCount: 0 });
    expect(result.percentage).toBe(25);
    expect(result.nextSteps).toContain("Add at least 3 photos");
  });
});
