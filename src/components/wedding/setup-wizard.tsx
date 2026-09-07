"use client";

import { WeddingDraft } from "./wedding-draft";
import { useActionState, useState, useEffect, useRef } from "react";
import { completeWeddingSetup, skipWeddingSetup } from "@/lib/actions/wedding";
import { initialActionState } from "@/lib/actions/state";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  WeddingBasicsFields,
  WeddingBudgetFields,
  WeddingCharacteristicsFields,
  WeddingPriorityFields,
  WeddingStyleFields,
  type WeddingFieldValues,
} from "./wedding-fields";

const errorSteps = [["weddingDate", "venueName", "venueStatus"], ["guestCount", "preferredArea", "eventType"], ["styles"], ["priorities"], ["totalBudgetShekels"]];
const steps = [
  { title: "Let’s begin with your plans", subtitle: "Share what you know so far. Every detail can change with you." },
  { title: "Wedding characteristics", subtitle: "A few practical details help everything fit." },
  { title: "Your wedding style", subtitle: "Choose every style that feels like you." },
  { title: "What matters most?", subtitle: "Choose up to four priorities." },
  { title: "Budget", subtitle: "This is optional and always editable." },
];

export function SetupWizard({ values }: { values: WeddingFieldValues }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [revision] = useState(values.revision);
  const [skipState, skipAction, skipping] = useActionState(skipWeddingSetup, initialActionState);
  const [step, setStep] = useState(0);
  const [state, action] = useActionState(async (previous: typeof initialActionState, form: FormData) => {
    const result = await completeWeddingSetup(previous, form);
    const index = errorSteps.findIndex(group => group.some(key => result.errors?.[key]?.length));
    if (index >= 0) setStep(index);
    return result;
  }, initialActionState);

  useEffect(() => {
    if (!state.errors) return;
    const fields = errorSteps;
    const index = fields.findIndex(group => group.some(key => state.errors?.[key]?.length));
    if (index >= 0) { const field = fields[index].find(key => state.errors?.[key]?.length)!;
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${field}"], [data-field="${field}"]`)?.focus()); }
  }, [state]);
  return (
    <WeddingDraft values={values}><form ref={formRef} noValidate onReset={e => e.preventDefault()} action={action} className="setup-wizard paper-panel mt-8 overflow-hidden">
      <input type="hidden" name="revision" value={revision ?? ""} />
      <div className="border-b bg-paper-muted px-5 py-4 sm:px-8">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
          <span>Step {step + 1} of {steps.length}</span>
          <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/60">
          <div className="h-full rounded-full bg-wine transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
      <div className="p-5 sm:p-8">
        <h2 className="font-display text-3xl">{steps[step].title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{steps[step].subtitle}</p>
        {skipState.message ? <p role="alert">{skipState.message}</p> : null}
        {state.status === "error" ? <p className="mt-4 rounded-xl bg-red-900/5 px-4 py-3 text-sm text-red-800" role="alert">{state.message ?? "Check the field errors and try again."}</p> : null}

        {revision !== values.revision ? <p role="status" className="mt-3 text-sm">Saved details changed. Reload this page before saving preferences; unsaved entries will need to be re-entered.</p> : null}
        <div className={step === 0 ? "mt-7" : "hidden"}><WeddingBasicsFields values={values} errors={state.errors} /></div>
        <div className={step === 1 ? "mt-7" : "hidden"}><WeddingCharacteristicsFields values={values} errors={state.errors} /></div>
        <div className={step === 2 ? "mt-7" : "hidden"}><WeddingStyleFields values={values} errors={state.errors} /></div>
        <div className={step === 3 ? "mt-7" : "hidden"}><WeddingPriorityFields values={values} errors={state.errors} /></div>
        <div className={step === 4 ? "mt-7" : "hidden"}><WeddingBudgetFields values={values} errors={state.errors} /></div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="min-h-11 rounded-full px-4 text-sm font-semibold text-ink-soft hover:text-wine disabled:invisible">Back</button>
          <div className="flex gap-3">
            <button disabled={skipping} formNoValidate formAction={skipAction} className="min-h-11 rounded-full px-4 text-sm font-semibold text-ink-soft hover:text-wine">Skip for now</button>
            {step < steps.length - 1 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="min-h-11 rounded-full bg-wine px-5 text-sm font-semibold text-white hover:bg-wine-dark">Continue</button>
            ) : (
              <SubmitButton pendingLabel="Preparing your space…">Finish setup</SubmitButton>
            )}
          </div>
        </div>
      </div>
    </form></WeddingDraft>
  );
}
