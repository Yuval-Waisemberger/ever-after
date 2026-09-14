"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, resetPassword } from "@/lib/actions/auth";
import { initialAuthState } from "@/lib/actions/auth-state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

type Audience = "couple" | "vendor";

function Feedback({ state }: { state: typeof initialAuthState }) {
  if (!state.message) return null;
  return <p className={`ea-feedback ${state.status === "error" ? "ea-feedback--error" : "ea-feedback--success"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>;
}

function LoginLinks({ audience }: { audience?: Audience }) {
  return <nav aria-label="Account recovery" className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5 text-sm text-wine">
    {audience ? <Link href={`/auth/${audience}?mode=login`} className="underline">Return to Login</Link> : <>
      <Link href="/auth/couple?mode=login" className="underline">Couple login</Link>
      <Link href="/auth/vendor?mode=login" className="underline">Vendor login</Link>
    </>}
  </nav>;
}

export function ForgotPasswordPanel({ audience }: { audience?: Audience }) {
  const [state, action] = useActionState(requestPasswordReset, initialAuthState);
  return <section className="auth-panel" aria-labelledby="forgot-password-title">
    <p className="eyebrow">Account recovery</p>
    <h1 id="forgot-password-title" className="font-display mt-3 text-4xl tracking-tight">Forgot your password?</h1>
    <p className="mt-3 leading-7 text-ink-soft">Enter your account email and we’ll send instructions for choosing a new password.</p>
    <form action={action} className="mt-7 grid gap-5">
      {audience ? <input type="hidden" name="audience" value={audience} /> : null}
      <FormField name="email" label="Email address" type="email" autoComplete="email" error={state.errors?.email?.[0]} required />
      <Feedback state={state} />
      {state.status === "success" ? <div className="password-reset-spam-notice rounded-xl border border-wine/30 bg-paper px-4 py-3 text-base font-semibold leading-6 text-wine" role="note">
        <p>Important: A password reset email may arrive in your Spam or Junk folder. Check those folders if needed.</p>
      </div> : null}
      <SubmitButton pendingLabel="Requesting reset link…">{state.status === "success" ? "Send another reset link" : "Send password reset link"}</SubmitButton>
    </form>
    <LoginLinks audience={audience} />
  </section>;
}

export function ResetPasswordPanel({ audience, available, issue }: {
  audience?: Audience;
  available: boolean;
  issue?: "invalid" | "expired" | "unavailable";
}) {
  const [state, action] = useActionState(resetPassword, initialAuthState);
  if (!available) {
    const unavailable = issue === "unavailable";
    const heading = unavailable ? "Password recovery is temporarily unavailable"
      : issue === "expired" ? "This reset link has expired" : "This reset link is not valid";
    const description = unavailable
      ? "We could not establish a secure password-recovery session right now. Please open the link again in a moment."
      : "This password reset link is invalid, expired or has already been used. Request a new link to continue safely.";
    return <section className="auth-panel" aria-labelledby="reset-password-title">
      <p className="eyebrow">Account recovery</p>
      <h1 id="reset-password-title" className="font-display mt-3 text-4xl tracking-tight">{heading}</h1>
      <p className="ea-feedback ea-feedback--error mt-5" role="alert">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="ea-button ea-button--primary" href={`/auth/forgot-password${audience ? `?audience=${audience}` : ""}`}>Request a new reset link</Link>
      </div>
      <LoginLinks audience={audience} />
    </section>;
  }
  const error = (name: string) => state.errors?.[name]?.[0];
  return <section className="auth-panel" aria-labelledby="reset-password-title">
    <p className="eyebrow">Account recovery</p>
    <h1 id="reset-password-title" className="font-display mt-3 text-4xl tracking-tight">Set a new password</h1>
    <p className="mt-3 leading-7 text-ink-soft">Choose a password you haven’t used before. You’ll sign in again after it is saved.</p>
    <form action={action} className="mt-7 grid gap-5">
      <Feedback state={state} />
      <FormField name="password" type="password" autoComplete="new-password" label="New password" error={error("password")} hint="At least 8 characters" required />
      <FormField name="confirmPassword" type="password" autoComplete="new-password" label="Confirm new password" error={error("confirmPassword")} required />
      <SubmitButton pendingLabel="Saving new password…">Set new password</SubmitButton>
    </form>
  </section>;
}
