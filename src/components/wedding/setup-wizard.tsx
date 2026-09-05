"use client";

import { useActionState, useState } from "react";
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

const steps = [
  { title: "Let’s begin with your plans", subtitle: "Share what you know so far. Every detail can change with you." },
  { title: "Wedding characteristics", subtitle: "A few practical details help everything fit." },
  { title: "Your wedding style", subtitle: "Choose every style that feels like you." },
  { title: "What matters most?", subtitle: "Choose up to four priorities." },
  { title: "Budget", subtitle: "This is optional and always editable." },
];

export function SetupWizard({ values }: { values: WeddingFieldValues }) {
  const [step, setStep] = useState(0);
  const [state, action] = useActionState(completeWeddingSetup, initialActionState);

  return (
    <form action={action} className="setup-wizard paper-panel mt-8 overflow-hidden">
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
        {state.status === "error" ? <p className="mt-4 rounded-xl bg-red-900/5 px-4 py-3 text-sm text-red-800" role="alert">{state.message ?? "Check the highlighted details and try again."}</p> : null}

        <div className={step === 0 ? "mt-7" : "hidden"}><WeddingBasicsFields values={values} /></div>
        <div className={step === 1 ? "mt-7" : "hidden"}><WeddingCharacteristicsFields values={values} /></div>
        <div className={step === 2 ? "mt-7" : "hidden"}><WeddingStyleFields values={values} /></div>
        <div className={step === 3 ? "mt-7" : "hidden"}><WeddingPriorityFields values={values} /></div>
        <div className={step === 4 ? "mt-7" : "hidden"}><WeddingBudgetFields values={values} /></div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="min-h-11 rounded-full px-4 text-sm font-semibold text-ink-soft hover:text-wine disabled:invisible">Back</button>
          <div className="flex gap-3">
            <button formAction={skipWeddingSetup} className="min-h-11 rounded-full px-4 text-sm font-semibold text-ink-soft hover:text-wine">Skip for now</button>
            {step < steps.length - 1 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="min-h-11 rounded-full bg-wine px-5 text-sm font-semibold text-white hover:bg-wine-dark">Continue</button>
            ) : (
              <SubmitButton pendingLabel="Preparing your space…">Finish setup</SubmitButton>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
