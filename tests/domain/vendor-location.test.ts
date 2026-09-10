import { describe, expect, it } from "vitest";
import {
  FIXED_LOCATION_SUBCATEGORY_SLUGS,
  deduplicateServiceAreas,
  formatVendorArea,
  hasExclusiveFlexibleArea,
  locationModeForSubcategory,
  vendorMatchesArea,
} from "@/lib/vendors/location";

describe("Vendor location semantics", () => {
  it("classifies only the approved fixed-location taxonomy as fixed", () => {
    expect(FIXED_LOCATION_SUBCATEGORY_SLUGS).toEqual(["wedding-venues", "preparation-hotels"]);
    expect(locationModeForSubcategory("wedding-venues")).toBe("fixed");
    expect(locationModeForSubcategory("preparation-hotels")).toBe("fixed");
    expect(locationModeForSubcategory("wedding-photographers")).toBe("mobile");
    expect(locationModeForSubcategory(null)).toBe("mobile");
  });

  it("matches fixed physical areas and mobile service coverage independently", () => {
    expect(vendorMatchesArea({ locationMode: "fixed", physicalArea: "north", serviceAreas: ["south"] }, "north")).toBe(true);
    expect(vendorMatchesArea({ locationMode: "fixed", physicalArea: "north", serviceAreas: ["south"] }, "south")).toBe(false);
    expect(vendorMatchesArea({ locationMode: "mobile", physicalArea: null, serviceAreas: ["south"] }, "south")).toBe(true);
    expect(vendorMatchesArea({ locationMode: "mobile", physicalArea: null, serviceAreas: ["flexible"] }, "jerusalem")).toBe(true);
  });

  it("deduplicates service areas and keeps flexible exclusive", () => {
    expect(deduplicateServiceAreas(["north", "north", "south"])).toEqual(["north", "south"]);
    expect(hasExclusiveFlexibleArea(["flexible"])).toBe(true);
    expect(hasExclusiveFlexibleArea(["flexible", "north"])).toBe(false);
    expect(formatVendorArea("jerusalem")).toBe("Jerusalem Area");
  });
});
