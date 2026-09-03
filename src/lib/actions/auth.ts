"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  coupleSignUpSchema,
  signInSchema,
  vendorSignUpSchema,
} from "@/lib/validation/auth";
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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
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
    message: "Check your email to confirm your account, then sign in to continue.",
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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
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
    message: "Check your email to confirm your account, then sign in to continue.",
  };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
