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
  issue?: "invalid" | "expired" | "profile";
}) {
  const [state, action] = useActionState(resendVerification, initialAuthState);
  const heading = issue === "profile" ? "Your account needs a moment"
    : issue === "expired" ? "This verification link has expired"
    : issue ? "Let’s get you a new verification link" : "Check your email";
  const description = issue === "profile"
    ? "Your sign-in was confirmed, but we could not open your account details. Please try signing in again. If this continues, contact support."
    : issue
      ? "This link is invalid, expired or has already been used. Request a fresh link below, or sign in if you have already verified your email."
      : "We sent a verification link to your email address. Verify your email to finish creating your Ever After account.";
  return (
    <section className="auth-panel" aria-labelledby="verification-title">
      <p className="eyebrow">{audience === "vendor" ? "For vendors" : audience === "couple" ? "For couples" : "Your Ever After account"}</p>
      <h1 id="verification-title" className="font-display mt-3 text-4xl tracking-tight">{heading}</h1>
      <p className={`ea-feedback mt-5 ${issue ? "ea-feedback--error" : "ea-feedback--success"}`} role={issue ? "alert" : "status"}>{description}</p>
      {issue !== "profile" ? <>
        <p className="mt-5 text-sm leading-7 text-ink-soft">Check your spam folder too. Open the latest link in the same browser where you requested it.</p>
        <form action={action} className="mt-6 grid gap-5">
          {audience ? <input type="hidden" name="audience" value={audience} /> : <label className="ea-field grid gap-2 text-sm font-medium">Account type
            <select name="audience" className="ea-input min-h-11 w-full px-3.5" required defaultValue="">
              <option value="" disabled>Choose your account type</option>
              <option value="couple">Couple</option><option value="vendor">Vendor</option>
            </select>
          </label>}
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
