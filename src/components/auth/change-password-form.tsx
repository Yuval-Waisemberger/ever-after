"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/auth";
import { initialAuthState } from "@/lib/actions/auth-state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, initialAuthState);
  const error = (name: string) => state.errors?.[name]?.[0];
  return <form action={action} className="grid gap-4">
    {state.message ? <p className={`ea-feedback ${state.status === "success" ? "ea-feedback--success" : "ea-feedback--error"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    <FormField name="password" type="password" autoComplete="new-password" label="New password" error={error("password")} hint="At least 8 characters" required />
    <FormField name="confirmPassword" type="password" autoComplete="new-password" label="Confirm new password" error={error("confirmPassword")} required />
    <SubmitButton className="justify-self-start" pendingLabel="Changing password…">Change password</SubmitButton>
  </form>;
}
