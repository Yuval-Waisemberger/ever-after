"use client";

import { useActionState } from "react";
import { saveWeddingDetails } from "@/lib/actions/wedding";
import { initialActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  WeddingBasicsFields,
  WeddingBudgetFields,
  WeddingCharacteristicsFields,
  WeddingPriorityFields,
  WeddingStyleFields,
  type WeddingFieldValues,
} from "./wedding-fields";

export function WeddingDetailsForm({
  values,
  partnerOneName,
  partnerTwoName,
}: {
  values: WeddingFieldValues;
  partnerOneName: string;
  partnerTwoName: string;
}) {
  const [state, action] = useActionState(saveWeddingDetails, initialActionState);
  return (
    <form action={action} className="mt-8 space-y-5">
      {state.message ? <p className={`rounded-xl px-4 py-3 text-sm ${state.status === "success" ? "bg-green-900/5 text-green-900" : "bg-red-900/5 text-red-800"}`} role="status">{state.message}</p> : null}
      <section className="rounded-2xl border bg-paper p-5 sm:p-7">
        <h2 className="font-display text-2xl">Your names</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField name="partnerOneName" label="Partner 1" defaultValue={partnerOneName} required />
          <FormField name="partnerTwoName" label="Partner 2" defaultValue={partnerTwoName} required />
        </div>
      </section>
      <section className="rounded-2xl border bg-paper p-5 sm:p-7"><h2 className="font-display text-2xl">Where things stand</h2><div className="mt-5"><WeddingBasicsFields values={values} /></div></section>
      <section className="rounded-2xl border bg-paper p-5 sm:p-7"><h2 className="font-display text-2xl">Wedding characteristics</h2><div className="mt-5"><WeddingCharacteristicsFields values={values} /></div></section>
      <section className="rounded-2xl border bg-paper p-5 sm:p-7"><h2 className="font-display text-2xl">Wedding style</h2><div className="mt-5"><WeddingStyleFields values={values} /></div></section>
      <section className="rounded-2xl border bg-paper p-5 sm:p-7"><h2 className="font-display text-2xl">What matters most</h2><p className="mt-2 text-sm text-ink-soft">Choose up to four.</p><div className="mt-5"><WeddingPriorityFields values={values} /></div></section>
      <section className="rounded-2xl border bg-paper p-5 sm:p-7"><h2 className="font-display text-2xl">Total budget</h2><div className="mt-5 max-w-md"><WeddingBudgetFields values={values} /></div></section>
      <SubmitButton className="px-7" pendingLabel="Saving details…">Save Wedding Details</SubmitButton>
    </form>
  );
}
