"use client";

import { useActionState } from "react";
import { submitReview } from "@/lib/actions/vendors";
import { initialActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

const dimensions = [
  ["professionalism", "Professionalism"],
  ["punctuality", "Punctuality"],
  ["serviceAttitude", "Service & attitude"],
  ["valueForMoney", "Value for money"],
] as const;

export function ReviewForm({ vendorId, vendorSlug, displayName }: { vendorId: string; vendorSlug: string; displayName: string }) {
  const [state, action] = useActionState(submitReview, initialActionState);
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="vendorId" value={vendorId} />
      <input type="hidden" name="vendorSlug" value={vendorSlug} />
      {state.message ? <p className={`rounded-xl px-4 py-3 text-sm ${state.status === "success" ? "bg-green-900/5 text-green-900" : "bg-red-900/5 text-red-800"}`} role="status">{state.message}</p> : null}
      <FormField name="reviewerDisplayName" label="Display name" defaultValue={displayName} required />
      <div className="grid gap-4 sm:grid-cols-2">
        {dimensions.map(([name, label]) => (
          <label key={name} className="grid gap-2 text-sm font-semibold">{label}<select name={name} defaultValue="5" className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
        ))}
      </div>
      <label className="grid gap-2 text-sm font-semibold">Would you choose this vendor again?<select name="wouldChooseAgain" defaultValue="yes" className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal"><option value="yes">Yes</option><option value="no">No</option></select></label>
      <label className="grid gap-2 text-sm font-semibold">Your review<textarea name="reviewText" rows={4} maxLength={3000} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" /></label>
      <SubmitButton className="justify-self-start" pendingLabel="Publishing review…">Publish review</SubmitButton>
    </form>
  );
}
