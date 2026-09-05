import { z } from "zod";

export const vendorStatusSchema = z.object({
  vendorId: z.string().uuid(),
  status: z.enum(["saved", "contacted", "considering", "booked", "rejected"]),
  agreedPriceShekels: z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    z.number().int().min(0).max(100_000_000).nullable(),
  ),
  privateNotes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().max(3000).nullable(),
  ),
});

const rating = z.preprocess((value) => Number(value), z.number().int().min(1).max(5));

export const reviewSchema = z.object({
  vendorId: z.string().uuid(),
  reviewerDisplayName: z.string().trim().min(1).max(100),
  professionalism: rating,
  punctuality: rating,
  serviceAttitude: rating,
  valueForMoney: rating,
  wouldChooseAgain: z.enum(["yes", "no"]).transform((value) => value === "yes"),
  reviewText: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().max(3000).nullable(),
  ),
});

export const reviewIdSchema = z.object({ id: z.string().uuid() });
