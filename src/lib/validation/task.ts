import { z } from "zod";

export const TASK_CATEGORIES = [
  "Planning & Admin",
  "Venue",
  "Photography & Video",
  "Music & Entertainment",
  "Beauty & Attire",
  "Design & Flowers",
  "Guests & Invitations",
  "Ceremony",
  "Transportation",
  "Budget & Payments",
  "Other",
] as const;

const optionalText = (max: number) =>
  z.union([z.literal(""), z.string().trim().max(max)]).transform((value) => value || null);

export const taskSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]).optional(),
  title: z.string().trim().min(1, "Enter a task title").max(160),
  notes: optionalText(3000),
  category: optionalText(80),
  dueDate: z
    .union([z.literal(""), z.iso.date("Enter a valid date")])
    .transform((value) => value || null),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "in_progress", "completed"]),
});

export const taskIdSchema = z.object({ id: z.string().uuid() });
export const taskStatusSchema = taskIdSchema.extend({
  status: z.enum(["open", "in_progress", "completed"]),
});
