import { z } from "zod";
import {
  VENDOR_AREA_VALUES,
  deduplicateServiceAreas,
  hasExclusiveFlexibleArea,
  type VendorLocationMode,
} from "@/lib/vendors/location";

const hasHttpProtocol = (value: string) => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
};

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.url("Enter a complete URL including https://")
    .refine(hasHttpProtocol, "Enter a complete URL including https://")
    .nullable(),
);
const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(value)),
  z.number().int().min(0).max(100_000_000).nullable(),
);
const optionalCapacity = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(value)),
  z.number().int().min(1).max(500_000).nullable(),
);
const optionalBusinessName = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().max(120).nullable(),
);

export const vendorProfileSchema = z
  .object({
    businessName: optionalBusinessName,
    contactName: z.string().trim().max(100).nullable(),
    description: z.string().trim().max(5000).nullable(),
    locationCity: z.string().trim().max(100).nullable(),
    physicalArea: z.preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
      z.enum(VENDOR_AREA_VALUES).nullable(),
    ),
    categoryId: z.string().uuid().nullable(),
    subcategoryId: z.string().uuid().nullable(),
    serviceAreas: z.array(z.enum(VENDOR_AREA_VALUES)).transform(deduplicateServiceAreas),
    minPriceShekels: optionalNumber,
    maxPriceShekels: optionalNumber,
    services: z.array(z.string().trim().min(1).max(100)).max(40),
    styles: z.array(z.string().trim().min(1).max(100)).max(20),
    eventTypes: z.array(z.enum(["evening", "friday_afternoon", "daytime", "undecided"])),
    minGuestCapacity: optionalCapacity,
    maxGuestCapacity: optionalCapacity,
    fridayAvailable: z.boolean(),
    indoorAvailable: z.boolean(),
    outdoorAvailable: z.boolean(),
    phone: z.string().trim().max(24).nullable(),
    email: z.preprocess((value) => (typeof value === "string" && value.trim() ? value.trim() : null), z.email().nullable()),
    websiteUrl: optionalUrl,
    instagramUrl: optionalUrl,
    isPublic: z.boolean(),
  })
  .refine((data) => hasExclusiveFlexibleArea(data.serviceAreas), {
    path: ["serviceAreas"],
    message: "Flexible cannot be combined with specific service areas",
  })
  .refine((data) => data.minPriceShekels == null || data.maxPriceShekels == null || data.minPriceShekels <= data.maxPriceShekels, { path: ["maxPriceShekels"], message: "Maximum price must be at least the minimum" })
  .refine((data) => data.minGuestCapacity == null || data.maxGuestCapacity == null || data.minGuestCapacity <= data.maxGuestCapacity, { path: ["maxGuestCapacity"], message: "Maximum capacity must be at least the minimum" });

export type VendorProfileInput = z.output<typeof vendorProfileSchema>;

export function validateVendorLocationForMode(
  data: VendorProfileInput,
  locationMode: VendorLocationMode,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (locationMode === "fixed") {
    if (data.serviceAreas.length) errors.serviceAreas = ["Fixed-location Vendors cannot submit service areas"];
    if (data.physicalArea === "flexible") errors.physicalArea = ["A physical area cannot be Flexible"];
    if (data.isPublic && !data.locationCity) errors.locationCity = ["Enter the physical city before publishing"];
    if (data.isPublic && !data.physicalArea) errors.physicalArea = ["Choose the physical area before publishing"];
  } else if (data.physicalArea != null) {
    errors.physicalArea = ["Mobile Vendors cannot submit a physical area"];
  }
  return errors;
}
