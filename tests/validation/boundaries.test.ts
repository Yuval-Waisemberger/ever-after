import { describe, expect, it } from "vitest";
import { paymentSchema } from "@/lib/validation/budget";
import { taskSchema } from "@/lib/validation/task";
import { reviewSchema } from "@/lib/validation/vendor";
import { validateVendorLocationForMode, vendorProfileSchema } from "@/lib/validation/vendor-profile";
import { weddingSetupSchema } from "@/lib/validation/wedding";

const profileBase = {
  businessName: "Sample Studio",
  contactName: null,
  description: null,
  locationCity: null,
  physicalArea: null,
  categoryId: null,
  subcategoryId: null,
  serviceAreas: [],
  minPriceShekels: "",
  maxPriceShekels: "",
  services: [],
  styles: [],
  eventTypes: [],
  minGuestCapacity: "",
  maxGuestCapacity: "",
  fridayAvailable: false,
  indoorAvailable: false,
  outdoorAvailable: false,
  phone: null,
  email: null,
  websiteUrl: "",
  instagramUrl: "",
  isPublic: false,
};

describe("server validation boundaries", () => {
  it("rejects a blank task title and invalid status", () => {
    const result = taskSchema.safeParse({
      title: " ",
      notes: "",
      category: "",
      dueDate: "2026-09-15",
      priority: "medium",
      status: "done",
    });
    expect(result.success).toBe(false);
  });

  it("requires a venue name when the venue is booked", () => {
    const result = weddingSetupSchema.safeParse({
      weddingDate: "",
      venueStatus: "booked",
      venueName: "",
      guestCount: "",
      preferredArea: "",
      eventType: "",
      styles: [],
      priorities: [],
      bookedCategories: [],
      totalBudgetShekels: "",
    });
    expect(result.success).toBe(false);
  });

  it("limits setup to four priorities", () => {
    const result = weddingSetupSchema.safeParse({
      weddingDate: "",
      venueStatus: "not_yet",
      venueName: "",
      guestCount: "",
      preferredArea: "",
      eventType: "",
      styles: [],
      priorities: ["Photography", "Food", "Location", "Guest experience", "Staying within budget"],
      bookedCategories: [],
      totalBudgetShekels: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects review ratings outside one to five", () => {
    const result = reviewSchema.safeParse({
      vendorId: "11111111-1111-4111-8111-111111111111",
      reviewerDisplayName: "A Couple",
      professionalism: "6",
      punctuality: "5",
      serviceAttitude: "5",
      valueForMoney: "5",
      wouldChooseAgain: "yes",
      reviewText: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects inverted vendor ranges and zero capacity", () => {
    const result = vendorProfileSchema.safeParse({
      ...profileBase,
      minPriceShekels: "10000",
      maxPriceShekels: "5000",
      minGuestCapacity: "0",
    });
    expect(result.success).toBe(false);
  });

  it.each(["https://vendor.example", "http://vendor.example", "  HTTPS://vendor.example/path  "])("accepts an HTTP(S) Vendor URL: %s", (websiteUrl) => {
    const result = vendorProfileSchema.parse({ ...profileBase, websiteUrl });
    expect(result.websiteUrl).toBe(websiteUrl.trim());
  });

  it.each(["javascript:alert(1)", "data:text/html,test", "ftp://vendor.example"])("rejects a non-HTTP Vendor URL: %s", (websiteUrl) => {
    expect(vendorProfileSchema.safeParse({ ...profileBase, websiteUrl }).success).toBe(false);
    expect(vendorProfileSchema.safeParse({ ...profileBase, instagramUrl: websiteUrl }).success).toBe(false);
  });

  it("deduplicates mobile areas and rejects flexible mixed with a specific area", () => {
    const deduplicated = vendorProfileSchema.parse({ ...profileBase, serviceAreas: ["north", "north", "south"] });
    expect(deduplicated.serviceAreas).toEqual(["north", "south"]);
    expect(vendorProfileSchema.safeParse({ ...profileBase, serviceAreas: ["flexible", "north"] }).success).toBe(false);
  });

  it("enforces fixed publication fields and rejects inactive forged location fields", () => {
    const fixed = vendorProfileSchema.parse({ ...profileBase, isPublic: true });
    expect(validateVendorLocationForMode(fixed, "fixed")).toMatchObject({ locationCity: expect.any(Array), physicalArea: expect.any(Array) });
    const forgedFixed = vendorProfileSchema.parse({ ...profileBase, serviceAreas: ["north"] });
    expect(validateVendorLocationForMode(forgedFixed, "fixed").serviceAreas).toBeDefined();
    const forgedMobile = vendorProfileSchema.parse({ ...profileBase, physicalArea: "north" });
    expect(validateVendorLocationForMode(forgedMobile, "mobile").physicalArea).toBeDefined();
  });

  it("rejects negative payment amounts", () => {
    const result = paymentSchema.safeParse({
      budgetItemId: "11111111-1111-4111-8111-111111111111",
      label: "Deposit",
      amountShekels: "-1",
      dueDate: "",
      isPaid: false,
      notes: "",
    });
    expect(result.success).toBe(false);
  });
});
