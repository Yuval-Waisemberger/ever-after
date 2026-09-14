import type { AppRole } from "@/lib/auth/user";

export type EmailLinkIssue = "invalid" | "expired" | "unavailable";
export type SupportedConfirmationType = "email" | "recovery";

export function isSupportedConfirmationType(value: unknown): value is SupportedConfirmationType {
  return value === "email" || value === "recovery";
}

export function parseConfirmationRequest(params: Record<string, string | string[] | undefined>): {
  tokenHash: string;
  type: SupportedConfirmationType;
} | null {
  const tokenHash = params.token_hash;
  const type = params.type;
  if (typeof tokenHash !== "string" || !isSupportedConfirmationType(type)) return null;
  if (!tokenHash || tokenHash.length > 2048 || /[\s\u0000-\u001f\u007f]/u.test(tokenHash)) return null;
  return { tokenHash, type };
}

export const verifiedEmailLoginMessage =
  "Your email has been verified successfully. We couldn’t sign you in automatically, so please log in to continue.";

export function emailLinkIssue(error: unknown): EmailLinkIssue {
  if (!error || typeof error !== "object") return "unavailable";

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const status = "status" in error && typeof error.status === "number" ? error.status : undefined;

  if (code === "otp_expired") return "expired";
  if (status === 429 || (status !== undefined && status >= 500)) return "unavailable";
  if (status !== undefined && status >= 400 && status < 500) return "invalid";
  return "unavailable";
}

export function providerRoleHint(user: { user_metadata?: unknown }): AppRole | null {
  if (!user.user_metadata || typeof user.user_metadata !== "object") return null;
  const role = "role" in user.user_metadata ? user.user_metadata.role : undefined;
  return role === "couple" || role === "vendor" ? role : null;
}

export function verifiedEmailLoginPath(role: AppRole) {
  const params = new URLSearchParams({ mode: "login", message: verifiedEmailLoginMessage });
  return `/auth/${role}?${params.toString()}`;
}
