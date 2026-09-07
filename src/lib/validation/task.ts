import { TASK_STATUSES } from "@/lib/domain/task-status";
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

const optionalText = (max: number, label: string) =>
  z.union([z.literal(""), z.string().trim().max(max, `${label} must be ${max} characters or fewer`)]).transform((value) => value || null);

export const taskSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]).optional(),
  title: z.string().trim().min(1, "Enter a task title").max(160, "Keep the title to 160 characters or fewer"),
  notes: optionalText(3000, "Notes"),
  category: optionalText(80, "Category"),
  dueDate: z
    .union([z.literal(""), z.iso.date("Enter a valid date")])
    .transform((value) => value || null),
  priority: z.enum(["low", "medium", "high"], { error: "Choose a valid priority" }),
  status: z.enum(TASK_STATUSES, { error: "Choose a valid task status" }),
});

export const taskIdSchema = z.object({ id: z.string().uuid() });
export const taskStatusSchema = taskIdSchema.extend({
  status: z.enum(TASK_STATUSES, { error: "Choose a valid task status" }),
});
