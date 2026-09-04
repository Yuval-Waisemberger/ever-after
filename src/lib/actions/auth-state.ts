import type { AuthFieldErrors } from "@/lib/validation/auth";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: AuthFieldErrors;
  verificationEmail?: string;
};

export const initialAuthState: AuthActionState = { status: "idle" };
