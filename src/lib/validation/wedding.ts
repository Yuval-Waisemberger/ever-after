import { BOOKING_CATEGORIES } from "@/lib/domain/booking-state";
import { z } from "zod";

export const WEDDING_STYLES = [
  "Vintage",
  "Rustic / Countryside",
  "Israeli",
  "Urban",
  "Elegant",
  "Classic",
  "Romantic",
  "Modern",
  "Luxury",
  "Nature",
  "Intimate",
  "Minimalist",
  "Party / Festival",
] as const;

export const WEDDING_PRIORITIES = [
  "Staying within budget",
  "Photography",
  "Food",
  "Music and party atmosphere",
  "Design and aesthetics",
  "Location",
  "Guest experience",
  "Intimate atmosphere",
  "Luxury experience",
] as const;

export const BOOKED_CATEGORIES = BOOKING_CATEGORIES.map(c => c.label);

export const AREAS = [
  ["central_israel", "Central Israel"],
  ["sharon", "Sharon"],
  ["north", "North"],
  ["jerusalem", "Jerusalem"],
  ["south", "South"],
  ["flexible", "Flexible"],
] as const;

export const EVENT_TYPES = [
  ["evening", "Evening"],
  ["friday_afternoon", "Friday afternoon"],
  ["daytime", "Daytime"],
  ["undecided", "Not decided"],
] as const;

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((value) => (value === "" ? null : value), z.enum(values).nullable());

const optionalInteger = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    z.number().int().min(min).max(max).nullable(),
  );

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().max(max).nullable(),
  );

export const weddingSetupSchema = z
  .object({
    weddingDate: z.preprocess(
      (value) => (value === "" ? null : value),
      z.iso.date("Enter a valid wedding date").nullable(),
    ),
    venueStatus: optionalEnum(["booked", "not_yet", "looking"]),
    venueName: optionalText(160),
    guestCount: optionalInteger(1, 5000),
    preferredArea: optionalEnum([
      "central_israel",
      "sharon",
      "north",
      "jerusalem",
      "south",
      "flexible",
    ]),
    eventType: optionalEnum(["evening", "friday_afternoon", "daytime", "undecided"]),
    styles: z.array(z.enum(WEDDING_STYLES)).max(WEDDING_STYLES.length),
    priorities: z.array(z.enum(WEDDING_PRIORITIES)).max(4, "Choose up to four priorities"),
    bookedCategories: z.array(z.enum(BOOKED_CATEGORIES)).max(BOOKED_CATEGORIES.length),
    totalBudgetShekels: optionalInteger(0, 100_000_000),
  })
  .refine((value) => value.venueStatus !== "booked" || Boolean(value.venueName), {
    path: ["venueName"],
    message: "Enter the booked venue name",
  });

export const weddingDetailsSchema = weddingSetupSchema.and(
  z.object({
    partnerOneName: z.string().trim().min(1).max(80),
    partnerTwoName: z.string().trim().min(1).max(80),
  }),
);
