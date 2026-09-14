"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resendVerification } from "@/lib/actions/auth";
import { initialAuthState } from "@/lib/actions/auth-state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

export function VerificationPanel({ audience, email = "", issue }: {
  audience?: "couple" | "vendor";
  email?: string;
  issue?: "invalid" | "expired" | "profile" | "unavailable";
}) {
  const [state, action] = useActionState(resendVerification, initialAuthState);
  const heading = issue === "profile" ? "Your account needs a moment"
    : issue === "unavailable" ? "Verification is temporarily unavailable"
    : issue === "expired" ? "This verification link has expired"
    : issue ? "Let’s get you a new verification link" : "Check your email";
  const description = issue === "profile"
    ? "Your sign-in was confirmed, but we could not open your account details. Please try signing in again. If this continues, contact support."
    : issue === "unavailable"
      ? "We could not verify this link right now. Please try opening it again in a moment."
    : issue && audience
      ? "This link is invalid, expired or has already been used. Request a fresh link below, or sign in if you have already verified your email."
    : issue
      ? "This link is invalid, expired or has already been used. Use the appropriate login below, or return to signup to request a new email."
      : "We sent a verification link to your email address. Verify your email to finish creating your Ever After account.";
  const canResend = Boolean(audience) && issue !== "profile";
  return (
    <section className="auth-panel" aria-labelledby="verification-title">
      <p className="eyebrow">{audience === "vendor" ? "For vendors" : audience === "couple" ? "For couples" : "Your Ever After account"}</p>
      <h1 id="verification-title" className="font-display mt-3 text-4xl tracking-tight">{heading}</h1>
      <p className={`ea-feedback mt-5 ${issue ? "ea-feedback--error" : "ea-feedback--success"}`} role={issue ? "alert" : "status"}>{description}</p>
      {canResend ? <>
        <div className="verification-spam-notice mt-5 rounded-xl border border-wine/30 bg-paper px-4 py-3 text-base font-semibold leading-6 text-wine" role="note">
          <p>Important: The verification email may arrive in your Spam or Junk folder. Check those folders if needed.</p>
        </div>
        <p className="mt-4 text-sm leading-7 text-ink-soft">If you requested more than one email, use the link in the newest one. For verification to work correctly, open it in this same browser.</p>
        <form action={action} className="mt-6 grid gap-5">
          {audience ? <input type="hidden" name="audience" value={audience} /> : null}
          <FormField name="email" label="Email address" type="email" autoComplete="email" defaultValue={email} required error={state.errors?.email?.[0]} />
          {state.message ? <p className={`ea-feedback ${state.status === "error" ? "ea-feedback--error" : "ea-feedback--success"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
          <SubmitButton pendingLabel="Requesting your email…">Resend verification email</SubmitButton>
        </form>
      </> : null}
      <nav aria-label="Account recovery" className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5 text-sm text-wine">
        {audience ? <><Link href={`/auth/${audience}?mode=login`} className="underline">Back to log in</Link><Link href={`/auth/${audience}`} className="underline">Back to sign up</Link></>
          : <><Link href="/auth/couple?mode=login" className="underline">Couple log in</Link><Link href="/auth/vendor?mode=login" className="underline">Vendor log in</Link><Link href="/auth/couple" className="underline">Couple sign up</Link><Link href="/auth/vendor" className="underline">Vendor sign up</Link></>}
      </nav>
    </section>
  );
}
