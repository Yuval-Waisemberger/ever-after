import { z } from "zod";

const optionalText = (maximum: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().max(maximum).nullable(),
);

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

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.email("Enter a valid email address").nullable(),
);

const optionalMoney = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(value)),
  z.number().int().min(0).max(100_000_000).nullable(),
);

export const externalVendorSchema = z.object({
  externalVendorId: z.preprocess(
    (value) => (typeof value === "string" && value ? value : null),
    z.string().uuid().nullable(),
  ),
  relationshipId: z.preprocess(
    (value) => (typeof value === "string" && value ? value : null),
    z.string().uuid().nullable(),
  ),
  businessName: z.string().trim().min(1, "Enter a business name").max(120),
  categoryId: z.preprocess(
    (value) => (typeof value === "string" && value ? value : null),
    z.string().uuid().nullable(),
  ),
  subcategoryId: z.preprocess(
    (value) => (typeof value === "string" && value ? value : null),
    z.string().uuid().nullable(),
  ),
  contactName: optionalText(120),
  phone: optionalText(32),
  email: optionalEmail,
  websiteUrl: optionalUrl,
  notes: optionalText(3000),
  lifecycleStatus: z.enum(["none", "contacted", "considering", "booked", "rejected"]),
  isSaved: z.preprocess(
    (value) => value === true || value === "on" || value === "true",
    z.boolean(),
  ),
  agreedPriceShekels: optionalMoney,
}).refine(
  (data) => data.subcategoryId == null || data.categoryId != null,
  { path: ["subcategoryId"], message: "Choose a category for this subcategory" },
);

export const savedVendorSchema = z.object({
  vendorId: z.string().uuid(),
  isSaved: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const relationshipSavedSchema = z.object({
  relationshipId: z.string().uuid(),
  isSaved: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const externalVendorIdSchema = z.object({
  externalVendorId: z.string().uuid(),
});
