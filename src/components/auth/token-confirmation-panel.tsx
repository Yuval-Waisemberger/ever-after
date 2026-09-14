"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthActionState } from "@/lib/actions/auth-state";
import { initialAuthState } from "@/lib/actions/auth-state";
import type { SupportedConfirmationType } from "@/lib/auth/email-confirmation";
import { SubmitButton } from "@/components/ui/submit-button";

type ConfirmationAction = (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;

function LoginLinks() {
  return <nav aria-label="Account recovery" className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5 text-sm text-wine">
    <Link href="/auth/couple?mode=login" className="underline">Couple log in</Link>
    <Link href="/auth/vendor?mode=login" className="underline">Vendor log in</Link>
  </nav>;
}

function ConfirmationForm({ type, action }: { type: SupportedConfirmationType; action: ConfirmationAction }) {
  const [state, formAction] = useActionState(action, initialAuthState);
  const emailConfirmation = type === "email";

  return <section className="auth-panel" aria-labelledby="confirmation-title">
    <p className="eyebrow">Secure email confirmation</p>
    <h1 id="confirmation-title" className="font-display mt-3 text-4xl tracking-tight">
      {emailConfirmation ? "Verify your email" : "Continue password recovery"}
    </h1>
    <p className="mt-3 leading-7 text-ink-soft">
      {emailConfirmation
        ? "For your security, choose the button below to verify your email and continue to your account."
        : "For your security, choose the button below to continue to the new-password form."}
    </p>
    <form action={formAction} className="mt-7 grid gap-5">
      {state.message ? <p className="ea-feedback ea-feedback--error" role="alert">{state.message}</p> : null}
      <SubmitButton pendingLabel={emailConfirmation ? "Verifying email…" : "Opening password reset…"}>
        {emailConfirmation ? "Verify email and continue" : "Continue to reset password"}
      </SubmitButton>
    </form>
    <LoginLinks />
  </section>;
}

export function TokenConfirmationPanel({ type, action }: {
  type?: SupportedConfirmationType;
  action?: ConfirmationAction;
}) {
  if (type && action) return <ConfirmationForm type={type} action={action} />;

  return <section className="auth-panel" aria-labelledby="confirmation-title">
    <p className="eyebrow">Secure email confirmation</p>
    <h1 id="confirmation-title" className="font-display mt-3 text-4xl tracking-tight">This confirmation link is not valid</h1>
    <p className="ea-feedback ea-feedback--error mt-5" role="alert">
      This link is invalid, expired or has already been used. Request a new email from the appropriate account page.
    </p>
    <LoginLinks />
  </section>;
}
