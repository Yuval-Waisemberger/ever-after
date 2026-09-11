import { describe, expect, it } from "vitest";
import { externalVendorSchema } from "@/lib/validation/external-vendor";

const uuid = "37a8d31f-0528-4aca-a6de-7aa931063828";

describe("external vendor validation", () => {
  it("accepts a private vendor with only a business name and relationship state", () => {
    const result = externalVendorSchema.safeParse({
      externalVendorId: "",
      relationshipId: "",
      businessName: "  Cedar String Quartet  ",
      categoryId: "",
      subcategoryId: "",
      contactName: "",
      phone: "",
      email: "",
      websiteUrl: "",
      notes: "",
      lifecycleStatus: "booked",
      isSaved: "on",
      agreedPriceShekels: "4200",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.businessName).toBe("Cedar String Quartet");
    expect(result.data.contactName).toBeNull();
    expect(result.data.isSaved).toBe(true);
    expect(result.data.agreedPriceShekels).toBe(4200);
  });

  it("validates contact details and category/subcategory consistency", () => {
    const base = {
      externalVendorId: "",
      relationshipId: "",
      businessName: "Vendor",
      categoryId: "",
      contactName: "",
      phone: "",
      notes: "",
      lifecycleStatus: "none",
      isSaved: "false",
      agreedPriceShekels: "",
    };
    expect(externalVendorSchema.safeParse({ ...base, email: "not-email", websiteUrl: "https://example.com", subcategoryId: "" }).success).toBe(false);
    expect(externalVendorSchema.safeParse({ ...base, email: "hello@example.com", websiteUrl: "example.com", subcategoryId: "" }).success).toBe(false);
    const mismatch = externalVendorSchema.safeParse({ ...base, email: "", websiteUrl: "", subcategoryId: uuid });
    expect(mismatch.success).toBe(false);
  });

  it("accepts only HTTP(S) website protocols and trims optional values", () => {
    const base = {
      externalVendorId: "", relationshipId: "", businessName: "Vendor", categoryId: "", subcategoryId: "",
      contactName: "", phone: "", email: "", notes: "", lifecycleStatus: "none", isSaved: "false", agreedPriceShekels: "",
    };
    expect(externalVendorSchema.parse({ ...base, websiteUrl: "  HTTPS://example.com/profile  " }).websiteUrl).toBe("HTTPS://example.com/profile");
    for (const websiteUrl of ["javascript:alert(1)", "data:text/html,test", "ftp://example.com"]) {
      expect(externalVendorSchema.safeParse({ ...base, websiteUrl }).success).toBe(false);
    }
  });
});
