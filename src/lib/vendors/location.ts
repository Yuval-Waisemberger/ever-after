export const VENDOR_AREA_VALUES = [
  "central_israel",
  "sharon",
  "north",
  "jerusalem",
  "south",
  "flexible",
] as const;

export type VendorArea = (typeof VENDOR_AREA_VALUES)[number];
export type VendorLocationMode = "fixed" | "mobile";

export const VENDOR_AREA_LABELS: Record<VendorArea, string> = {
  central_israel: "Central Israel",
  sharon: "Sharon",
  north: "North",
  jerusalem: "Jerusalem Area",
  south: "South",
  flexible: "Flexible",
};

export const FIXED_LOCATION_SUBCATEGORY_SLUGS = [
  "wedding-venues",
  "preparation-hotels",
] as const;

const fixedLocationSubcategories = new Set<string>(FIXED_LOCATION_SUBCATEGORY_SLUGS);
const vendorAreas = new Set<string>(VENDOR_AREA_VALUES);

export function locationModeForSubcategory(subcategorySlug: string | null | undefined): VendorLocationMode {
  return subcategorySlug && fixedLocationSubcategories.has(subcategorySlug) ? "fixed" : "mobile";
}

export function resolveVendorLocationMode(vendor: {
  subcategorySlug?: string | null;
  locationMode?: VendorLocationMode | null;
}): VendorLocationMode {
  if (vendor.subcategorySlug) return locationModeForSubcategory(vendor.subcategorySlug);
  return vendor.locationMode === "fixed" ? "fixed" : "mobile";
}

export function isVendorArea(value: string | null | undefined): value is VendorArea {
  return value != null && vendorAreas.has(value);
}

export function formatVendorArea(value: string): string {
  return isVendorArea(value)
    ? VENDOR_AREA_LABELS[value]
    : value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function deduplicateServiceAreas(values: readonly VendorArea[]): VendorArea[] {
  return [...new Set(values)];
}

export function hasExclusiveFlexibleArea(values: readonly VendorArea[]): boolean {
  return !values.includes("flexible") || values.length === 1;
}

export function vendorMatchesArea(
  vendor: { subcategorySlug?: string | null; locationMode?: VendorLocationMode | null; physicalArea?: string | null; serviceAreas?: string[] | null },
  area: VendorArea,
): boolean {
  if (resolveVendorLocationMode(vendor) === "fixed") return vendor.physicalArea === area;
  return Boolean(vendor.serviceAreas?.includes(area) || vendor.serviceAreas?.includes("flexible"));
}
