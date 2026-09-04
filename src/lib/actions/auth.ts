"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  coupleSignUpSchema,
  signInSchema,
  vendorSignUpSchema,
  resendVerificationSchema,
} from "@/lib/validation/auth";
import { signupCallbackUrl } from "@/lib/auth/redirect";
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

export async function signIn(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return missingConfig();
  const parsed = signInSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: "Email or password is incorrect." };

  const { data: profile } = await supabase.from("profiles").select("role").single();
  redirect(profile?.role === "vendor" ? "/vendor" : "/wedding");
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
  if (error) return { status: "error", message: error.message };
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
  if (error) return { status: "error", message: error.message };
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
