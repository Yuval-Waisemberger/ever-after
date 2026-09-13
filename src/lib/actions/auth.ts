"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  coupleSignUpSchema,
  signInSchema,
  vendorSignUpSchema,
  resendVerificationSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { passwordRecoveryCallbackUrl, signupCallbackUrl } from "@/lib/auth/redirect";
import { getCurrentProfile, resolveAuthenticatedProfile, type AppRole } from "@/lib/auth/user";
import type { AuthActionState } from "./auth-state";

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function missingConfig(): AuthActionState {
  return {
    status: "error",
    message:
      "Supabase is not connected yet. Add the public project URL and publishable key to .env.local.",
  };
}

function callbackFor(audience: "couple" | "vendor") {
  try { return signupCallbackUrl(audience); } catch { return null; }
}

const callbackConfigError: AuthActionState = {
  status: "error",
  message: "Account email delivery is not ready yet. Please try again later.",
};

const resetRequestConfirmation = "If an account exists for this email, we’ve sent a password reset link.";

function loginAfterPasswordUpdate(role: AppRole, message: string) {
  const params = new URLSearchParams({ mode: "login", message });
  return `/auth/${role}?${params.toString()}`;
}

async function signOutAfterPasswordUpdate(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) await supabase.auth.signOut({ scope: "local" });
}

const roleResolutionError: AuthActionState = { status: "error", message: "We could not verify your account type. Please try again." };

async function clearRejectedLogin(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Still expire the browser session if provider revocation is unavailable.
  } finally {
    const store = await cookies();
    const key = `sb-${new URL(getSupabaseConfig().url).hostname.split(".")[0]}-auth-token`;
    for (const cookie of store.getAll()) {
      if (cookie.name === key || cookie.name.startsWith(`${key}.`)) store.delete(cookie.name);
    }
  }
}

async function signInForRole(expectedRole: AppRole, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return missingConfig();
  const parsed = signInSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  // Do not replace or clear an unrelated session from another open Auth tab.
  let existing;
  try {
    const { data, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError) return roleResolutionError;
    if (typeof data?.claims?.sub === "string") existing = await resolveAuthenticatedProfile(supabase, data.claims.sub);
    if (data?.claims?.sub && !existing) return roleResolutionError;
  } catch { return roleResolutionError; }
  if (existing) redirect(existing.role === "vendor" ? "/vendor" : "/wedding");

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: "Email or password is incorrect." };

  let profile;
  try {
    profile = data.user?.id ? await resolveAuthenticatedProfile(supabase, data.user.id) : null;
  } catch { profile = null; }
  if (!profile || profile.role !== expectedRole) {
    await clearRejectedLogin(supabase);
    if (!profile) return roleResolutionError;
    const account = profile.role === "vendor" ? "Vendor" : "Couple";
    return { status: "error", message: `This account is registered as a ${account}. Please use ${account} sign in.` };
  }
  redirect(profile.role === "vendor" ? "/vendor" : "/wedding");
}

export async function signInCouple(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  return signInForRole("couple", formData);
}

export async function signInVendor(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  return signInForRole("vendor", formData);
}

export async function signUpCouple(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return missingConfig();
  const parsed = coupleSignUpSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const { secondEmail, ...values } = parsed.data;
  const emailRedirectTo = callbackFor("couple");
  if (!emailRedirectTo) return callbackConfigError;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo,
      data: {
        role: "couple",
        display_name: values.displayName,
        partner_one_name: values.partnerOneName,
        partner_two_name: values.partnerTwoName,
        partner_one_phone: values.partnerOnePhone || null,
        partner_two_phone: values.partnerTwoPhone || null,
        second_email: secondEmail || null,
      },
    },
  });
  if (error) return { status: "error", message: "Your account could not be created. Please try again or sign in if you already have an account." };
  if (data.session) redirect("/wedding/setup");
  return {
    status: "success",
    verificationEmail: values.email,
    message: "We sent a verification link to your email address. Verify your email to finish creating your Ever After account.",
  };
}

export async function signUpVendor(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return missingConfig();
  const parsed = vendorSignUpSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const values = parsed.data;
  const emailRedirectTo = callbackFor("vendor");
  if (!emailRedirectTo) return callbackConfigError;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo,
      data: {
        role: "vendor",
        business_name: values.businessName,
        display_name: values.businessName,
        contact_name: values.contactName,
        phone: values.phone || null,
      },
    },
  });
  if (error) return { status: "error", message: "Your account could not be created. Please try again or sign in if you already have an account." };
  if (data.session) redirect("/vendor");
  return {
    status: "success",
    verificationEmail: values.email,
    message: "We sent a verification link to your email address. Verify your email to finish creating your Ever After account.",
  };
}

export async function resendVerification(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resendVerificationSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  if (!isSupabaseConfigured()) return missingConfig();
  const emailRedirectTo = callbackFor(parsed.data.audience);
  if (!emailRedirectTo) return callbackConfigError;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: { emailRedirectTo },
    });
    if (error?.status === 429) return { status: "error", message: "Please wait a little before requesting another verification email." };
    // Do not relay account-specific provider errors or disclose account existence.
    if (error && (!error.status || error.status >= 500)) return { status: "error", message: "We could not request an email right now. Please try again later." };
    return { status: "success", message: "If this address has an account awaiting verification, a new link will arrive shortly. Check your inbox and spam folder." };
  } catch {
    return { status: "error", message: "We could not request an email right now. Please try again later." };
  }
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function changePassword(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return missingConfig();
  const parsed = changePasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Please sign in again before changing your password." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: "Your password could not be changed. Please sign in again and retry." };
  await signOutAfterPasswordUpdate(supabase);
  redirect(loginAfterPasswordUpdate(profile.role, "Your password has been updated. Please sign in again."));
}

export async function requestPasswordReset(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = requestPasswordResetSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  if (!isSupabaseConfigured()) return missingConfig();
  let redirectTo: string;
  try {
    redirectTo = passwordRecoveryCallbackUrl(parsed.data.audience || undefined);
  } catch {
    return callbackConfigError;
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
    if (error?.status === 429) return { status: "error", message: "Please wait a little before requesting another reset email." };
    if (error && (!error.status || error.status >= 500)) return { status: "error", message: "We could not request an email right now. Please try again later." };
    // Deliberately return the same response for an existing or unknown account.
    return { status: "success", message: resetRequestConfirmation };
  } catch {
    return { status: "error", message: "We could not request an email right now. Please try again later." };
  }
}

export async function resetPassword(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return missingConfig();
  const parsed = resetPasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "This reset link is invalid or has expired. Request a new reset link." };
  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { status: "error", message: "Your password could not be reset. Request a new reset link and try again." };
  } catch {
    return { status: "error", message: "Your password could not be reset. Request a new reset link and try again." };
  }
  try {
    await signOutAfterPasswordUpdate(supabase);
  } catch {
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* Redirect after the confirmed update. */ }
  }
  redirect(loginAfterPasswordUpdate(profile.role, "Your password has been reset. Please sign in with your new password."));
}
