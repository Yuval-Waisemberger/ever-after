"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUpCouple, signUpVendor } from "@/lib/actions/auth";
import { initialAuthState } from "@/lib/actions/auth-state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { VerificationPanel } from "./verification-panel";

type AuthPanelProps = {
  audience: "couple" | "vendor";
  initialMode?: "login" | "signup";
  message?: string;
};

function ActionMessage({ state }: { state: typeof initialAuthState }) {
  if (!state.message) return null;
  return (
    <p
      className={`ea-feedback ${
        state.status === "success"
          ? "ea-feedback--success"
          : "ea-feedback--error"
      }`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

export function AuthPanel({ audience, initialMode = "signup", message }: AuthPanelProps) {
  const [mode, setMode] = useState(initialMode);
  const action = mode === "login" ? signIn : audience === "couple" ? signUpCouple : signUpVendor;
  const [state, formAction] = useActionState(action, initialAuthState);
  const error = (name: string) => state.errors?.[name]?.[0];

  if (mode === "signup" && state.verificationEmail) {
    return <VerificationPanel audience={audience} email={state.verificationEmail} />;
  }

  return (
    <div className="auth-panel">
      <p className="eyebrow">{audience === "couple" ? "For couples" : "For vendors"}</p>
      <h1 className="font-display mt-3 text-4xl tracking-tight">
        {mode === "login" ? "Welcome back" : audience === "couple" ? "Create your shared space" : "Create your business account"}
      </h1>
      <p className="mt-3 leading-7 text-ink-soft">
        {mode === "login"
          ? "Sign in to continue where you left off."
          : audience === "couple"
            ? "Start planning together. Make it yours now, or settle into the details later."
            : "Start with your account, then shape the public profile couples will discover."}
      </p>

      {message ? <p className="ea-feedback mt-5" role="status">{message}</p> : null}
      <form action={formAction} className="mt-7 grid gap-5">
        <ActionMessage state={state} />

        {mode === "signup" && audience === "couple" ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField name="partnerOneName" label="First Partner's Name" autoComplete="given-name" error={error("partnerOneName")} required />
              <FormField name="partnerTwoName" label="Second Partner's Name" autoComplete="given-name" error={error("partnerTwoName")} required />
            </div>
            <FormField name="displayName" label="Couple display name" placeholder="Noa & Omer" error={error("displayName")} required />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField name="partnerOnePhone" type="tel" label="First Partner's Phone (optional)" autoComplete="tel" error={error("partnerOnePhone")} />
              <FormField name="partnerTwoPhone" type="tel" label="Second Partner's Phone (optional)" autoComplete="tel" error={error("partnerTwoPhone")} />
            </div>
          </>
        ) : null}

        {mode === "signup" && audience === "vendor" ? (
          <>
            <FormField name="businessName" label="Business name" autoComplete="organization" error={error("businessName")} required />
            <FormField name="contactName" label="Contact person" autoComplete="name" error={error("contactName")} required />
            <FormField name="phone" type="tel" label="Phone (optional)" autoComplete="tel" error={error("phone")} />
          </>
        ) : null}

        <FormField name="email" type="email" label="Primary email" autoComplete="email" error={error("email")} required />
        {mode === "signup" && audience === "couple" ? (
          <FormField name="secondEmail" type="email" label="Second email (optional)" autoComplete="email" error={error("secondEmail")} />
        ) : null}
        <FormField name="password" type="password" label="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} error={error("password")} hint={mode === "signup" ? "At least 8 characters" : undefined} required />
        {mode === "signup" ? (
          <FormField name="confirmPassword" type="password" label="Confirm password" autoComplete="new-password" error={error("confirmPassword")} required />
        ) : null}

        <SubmitButton pendingLabel={mode === "login" ? "Signing in…" : "Creating account…"}>
          {mode === "login" ? "Sign in" : "Create account"}
        </SubmitButton>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm">
        <button type="button" className="font-semibold text-wine underline-offset-4 hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Create an account" : "Already have an account? Sign in"}
        </button>
        <Link className="text-ink-soft underline-offset-4 hover:text-wine hover:underline" href={audience === "couple" ? "/auth/vendor" : "/auth/couple"}>
          {audience === "couple" ? "I’m a vendor" : "We’re a couple"}
        </Link>
      </div>
    </div>
  );
}
