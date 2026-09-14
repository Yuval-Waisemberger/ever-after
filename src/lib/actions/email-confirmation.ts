"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthActionState } from "@/lib/actions/auth-state";
import {
  emailLinkIssue,
  isSupportedConfirmationType,
  providerRoleHint,
  verifiedEmailLoginPath,
  type EmailLinkIssue,
  type SupportedConfirmationType,
} from "@/lib/auth/email-confirmation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AccessResult =
  | { kind: "none" }
  | { kind: "authorized"; role?: "couple" | "vendor" }
  | { kind: "unavailable" }
  | { kind: "profile" };

const unavailableState: AuthActionState = {
  status: "error",
  message: "Confirmation is temporarily unavailable. Please try again in a moment.",
};

function issuePath(type: SupportedConfirmationType, issue: EmailLinkIssue | "profile") {
  const path = type === "recovery" ? "/auth/reset-password" : "/auth/verification";
  return `${path}?${new URLSearchParams({ issue }).toString()}`;
}

function redirectForIssue(type: SupportedConfirmationType, issue: EmailLinkIssue | "profile"): never {
  redirect(issuePath(type, issue));
}

async function readStoredRole(supabase: SupabaseClient, userId: string): Promise<AccessResult> {
  let result;
  try {
    result = await supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle();
  } catch {
    return { kind: "profile" };
  }

  if (result.error) return { kind: "profile" };
  if (!result.data || result.data.id !== userId) return { kind: "profile" };
  if (result.data.role !== "couple" && result.data.role !== "vendor") return { kind: "profile" };
  return { kind: "authorized", role: result.data.role };
}

async function readAccess(supabase: SupabaseClient, type: SupportedConfirmationType, expectedUserId?: string): Promise<AccessResult> {
  let claimsResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;
  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    return { kind: "unavailable" };
  }

  if (claimsResult.error) return { kind: "unavailable" };
  const userId = claimsResult.data?.claims?.sub;
  if (typeof userId !== "string" || !userId) return { kind: "none" };
  if (expectedUserId && userId !== expectedUserId) return { kind: "unavailable" };
  if (type === "recovery") return { kind: "authorized" };
  return readStoredRole(supabase, userId);
}

async function existingAccess(type: SupportedConfirmationType): Promise<AccessResult> {
  let hasAuthCookie: boolean;
  try {
    const store = await cookies();
    hasAuthCookie = store.getAll().some(cookie => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  } catch {
    return { kind: "unavailable" };
  }
  if (!hasAuthCookie) return { kind: "none" };

  try {
    return readAccess(await createClient(), type);
  } catch {
    return { kind: "unavailable" };
  }
}

function continueWithAccess(type: SupportedConfirmationType, access: Extract<AccessResult, { kind: "authorized" }>): never {
  if (type === "recovery") redirect("/auth/reset-password");
  redirect(access.role === "vendor" ? "/vendor" : "/wedding");
}

export async function confirmEmailToken(
  tokenHash: string,
  type: SupportedConfirmationType,
  _previous: AuthActionState,
  _formData: FormData,
): Promise<AuthActionState> {
  void _previous;
  void _formData;
  if (!isSupportedConfirmationType(type) || !tokenHash || tokenHash.length > 2048 || /[\s\u0000-\u001f\u007f]/u.test(tokenHash)) {
    redirectForIssue(type === "recovery" ? "recovery" : "email", "invalid");
  }
  if (!isSupabaseConfigured()) return unavailableState;

  const current = await existingAccess(type);
  if (current.kind === "authorized") continueWithAccess(type, current);
  if (current.kind === "unavailable") return unavailableState;
  if (current.kind === "profile") redirectForIssue(type, "profile");

  let supabase: SupabaseClient;
  try {
    supabase = await createClient();
  } catch {
    return unavailableState;
  }

  let result: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;
  try {
    result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  } catch {
    return unavailableState;
  }

  if (result.error) {
    const issue = emailLinkIssue(result.error);
    if (issue === "unavailable") return unavailableState;
    redirectForIssue(type, issue);
  }

  const { session, user } = result.data;
  if (!user) return unavailableState;
  const fallbackRole = providerRoleHint(user);
  if (!session?.access_token) {
    if (type === "email" && fallbackRole) redirect(verifiedEmailLoginPath(fallbackRole));
    redirectForIssue(type, type === "email" ? "profile" : "unavailable");
  }

  let persisted: AccessResult;
  try {
    // A fresh client proves that the session is available through the SSR cookie
    // handoff, rather than only inside the client that consumed the token.
    persisted = await readAccess(await createClient(), type, user.id);
  } catch {
    persisted = { kind: "unavailable" };
  }

  if (persisted.kind === "authorized") continueWithAccess(type, persisted);
  if (persisted.kind === "profile") redirectForIssue(type, "profile");
  if (type === "email" && fallbackRole) redirect(verifiedEmailLoginPath(fallbackRole));
  redirectForIssue(type, type === "email" ? "profile" : "unavailable");
}
