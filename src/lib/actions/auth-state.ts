import type { AuthFieldErrors } from "@/lib/validation/auth";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: AuthFieldErrors;
};

export const initialAuthState: AuthActionState = { status: "idle" };
