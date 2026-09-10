import { describe, expect, it } from "vitest";
import { calculateVendorProfileCompletion } from "@/lib/domain/vendor-profile";

describe("vendor profile completion", () => {
  it("is transparent and based on eight visible checks", () => {
    const result = calculateVendorProfileCompletion({ businessName: "Maya", description: "Story-led photos", imageCount: 0 });
    expect(result.percentage).toBe(25);
    expect(result.nextSteps).toContain("Add at least 2 photos");
  });
});


describe("business photo completion threshold", () => {
  it.each([0, 1, 2, 3])("uses business photo count %s", imageCount => {
    const result = calculateVendorProfileCompletion({imageCount});
    expect(result.nextSteps.includes("Add at least 2 photos")).toBe(imageCount < 2);
    expect(result.percentage).toBe(imageCount >= 2 ? 13 : 0);
  });
});
