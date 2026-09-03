import { z } from "zod";

const money = (required = false) =>
  z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    required
      ? z.number().positive("Enter an amount greater than zero").max(100_000_000)
      : z.number().min(0).max(100_000_000).nullable(),
  );

export const totalBudgetSchema = z.object({ totalBudgetShekels: money() });

export const budgetItemSchema = z
  .object({
    id: z.union([z.literal(""), z.string().uuid()]).optional(),
    coupleVendorId: z.union([z.literal(""), z.string().uuid()]).transform((value) => value || null),
    label: z.string().trim().min(1, "Enter an expense name").max(160),
    category: z.union([z.literal(""), z.string().trim().max(80)]).transform((value) => value || null),
    estimatedShekels: money(),
    committedShekels: money(),
    notes: z.union([z.literal(""), z.string().trim().max(3000)]).transform((value) => value || null),
  })
  .refine((value) => value.estimatedShekels != null || value.committedShekels != null, {
    path: ["estimatedShekels"],
    message: "Add an estimated or committed amount",
  });

export const paymentSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]).optional(),
  budgetItemId: z.string().uuid(),
  label: z.string().trim().min(1, "Enter a payment name").max(120),
  amountShekels: money(true),
  dueDate: z.preprocess((value) => (value === "" ? null : value), z.iso.date().nullable()),
  isPaid: z.boolean(),
  notes: z.union([z.literal(""), z.string().trim().max(2000)]).transform((value) => value || null),
});

export const entityIdSchema = z.object({ id: z.string().uuid() });
