import { z } from "zod";
import { GUEST_RSVP_STATUSES, GUEST_SIDES } from "@/lib/domain/guests";

export const GUEST_GROUP_SUGGESTIONS = [
  "Family",
  "Friends",
  "Work",
  "Army",
  "University",
  "Neighbors",
] as const;

const blankToNull = (max: number) => z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.union([z.literal(""), z.string().max(max)]).optional().nullable(),
).transform((value) => value || null);

const optionalEmail = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.union([z.literal(""), z.email("Enter a valid email address").max(254)]).optional().nullable(),
).transform((value) => value || null);

const integerField = (label: string, minimum: number, maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
  z.number({ error: `${label} is required` }).int(`${label} must be a whole number`).min(minimum, `${label} must be at least ${minimum}`).max(maximum, `${label} cannot exceed ${maximum}`),
);

const optionalAttendance = z.preprocess(
  (value) => value == null || value === "" ? null : typeof value === "string" ? Number(value) : value,
  z.number().int("Attending count must be a whole number").min(0).max(20).nullable(),
);

export const guestSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional(),
  fullName: z.string().trim().min(1, "Enter a guest or household name").max(160, "Name cannot exceed 160 characters"),
  partyName: blankToNull(120),
  guestGroup: blankToNull(80),
  side: z.preprocess((value) => value === "" || value == null ? null : value, z.enum(GUEST_SIDES).nullable()),
  phone: blankToNull(40),
  email: optionalEmail,
  rsvpStatus: z.enum(GUEST_RSVP_STATUSES),
  invitedCount: integerField("Invited count", 1, 20),
  attendingCount: optionalAttendance,
  dietaryNotes: blankToNull(2000),
  privateNotes: blankToNull(3000),
}).superRefine((guest, context) => {
  if (guest.rsvpStatus === "attending") {
    if (guest.attendingCount == null || guest.attendingCount < 1) {
      context.addIssue({ code: "custom", path: ["attendingCount"], message: "Enter at least one attending guest" });
    } else if (guest.attendingCount > guest.invitedCount) {
      context.addIssue({ code: "custom", path: ["attendingCount"], message: "Attending cannot exceed invited" });
    }
  } else if (guest.rsvpStatus === "not_attending") {
    if (guest.attendingCount != null && guest.attendingCount !== 0) {
      context.addIssue({ code: "custom", path: ["attendingCount"], message: "Not attending must have zero attendees" });
    }
  } else if (guest.attendingCount != null) {
    context.addIssue({ code: "custom", path: ["attendingCount"], message: "Attending count is only used after attendance is confirmed" });
  }
}).transform((guest) => ({
  ...guest,
  attendingCount: guest.rsvpStatus === "not_attending" ? 0 : guest.rsvpStatus === "attending" ? guest.attendingCount : null,
}));

export const guestIdSchema = z.object({ id: z.uuid() });
