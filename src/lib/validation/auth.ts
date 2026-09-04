import { z } from "zod";

const phone = z
  .string()
  .trim()
  .max(24, "Phone number is too long")
  .refine(
    (value) => value === "" || /^[+0-9][0-9+() .-]{6,23}$/.test(value),
    "Enter a valid phone number",
  );

const email = z.string().trim().email("Enter a valid email address").max(254);
const password = z.string().min(8, "Use at least 8 characters").max(72);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const coupleSignUpSchema = z
  .object({
    partnerOneName: z.string().trim().min(1, "Enter Partner 1's name").max(80),
    partnerTwoName: z.string().trim().min(1, "Enter Partner 2's name").max(80),
    displayName: z.string().trim().min(1, "Enter a display name").max(100),
    partnerOnePhone: phone,
    partnerTwoPhone: phone,
    email,
    secondEmail: z.union([z.literal(""), email]),
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const vendorSignUpSchema = z
  .object({
    businessName: z.string().trim().min(1, "Enter your business name").max(120),
    contactName: z.string().trim().min(1, "Enter a contact name").max(100),
    phone,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type AuthFieldErrors = Record<string, string[] | undefined>;

export const resendVerificationSchema = z.object({
  email,
  audience: z.enum(["couple", "vendor"]),
});
