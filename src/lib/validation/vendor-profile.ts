import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.url("Enter a complete URL including https://").nullable(),
);
const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(value)),
  z.number().int().min(0).max(100_000_000).nullable(),
);
const optionalCapacity = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(value)),
  z.number().int().min(1).max(500_000).nullable(),
);

export const vendorProfileSchema = z
  .object({
    businessName: z.string().trim().min(1).max(120),
    contactName: z.string().trim().max(100).nullable(),
    description: z.string().trim().max(5000).nullable(),
    locationCity: z.string().trim().max(100).nullable(),
    categoryId: z.string().uuid().nullable(),
    subcategoryId: z.string().uuid().nullable(),
    serviceAreas: z.array(z.enum(["central_israel", "sharon", "north", "jerusalem", "south", "flexible"])),
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
  .refine((data) => data.minPriceShekels == null || data.maxPriceShekels == null || data.minPriceShekels <= data.maxPriceShekels, { path: ["maxPriceShekels"], message: "Maximum price must be at least the minimum" })
  .refine((data) => data.minGuestCapacity == null || data.maxGuestCapacity == null || data.minGuestCapacity <= data.maxGuestCapacity, { path: ["maxGuestCapacity"], message: "Maximum capacity must be at least the minimum" });
