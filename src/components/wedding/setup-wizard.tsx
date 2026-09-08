"use client";

import { WeddingDraft, useWeddingDraft } from "./wedding-draft";
import "./setup-visual.css";
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

/** A presentation of supplied details, separate from the persisted setup status. */
export function SetupProgress({ step }: { step: number }) {
  const draft = useWeddingDraft()?.values ?? {};
  const guests = Number(draft.guestCount);
  const budget = Number(draft.totalBudgetShekels);
  const sections = [
    Boolean(draft.weddingDate),
    guests >= 1 && guests <= 5000 && Boolean(draft.preferredArea && draft.eventType),
    Array.isArray(draft.styles) && draft.styles.length > 0,
    Array.isArray(draft.priorities) && draft.priorities.length > 0 && draft.priorities.length <= 4,
    draft.totalBudgetShekels !== undefined && draft.totalBudgetShekels !== "" && Number.isFinite(budget) && budget >= 0,
  ];
  const added = sections.filter(Boolean).length;
  return <div className="setup-progress border-b px-5 py-4 sm:px-8">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
      <span>Step {step + 1} of {steps.length}</span>
      <span>Details added · {added} of {steps.length}</span>
    </div>
    <div className="setup-progress__track mt-3" role="progressbar" aria-label="Setup details added" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={added} aria-valuetext={`${added} of ${steps.length} sections with details. Date and budget remain optional.`}>
      <div className="setup-progress__fill" style={{ width: `${added / steps.length * 100}%` }} />
    </div>
  </div>;
}

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
      <SetupProgress step={step} />
      <div className="p-5 sm:p-8">
        <div key={step} className="setup-step-intro"><h2 className="font-display text-3xl">{steps[step].title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{steps[step].subtitle}</p></div>
        {skipState.message ? <p role="alert">{skipState.message}</p> : null}
        {state.status === "error" ? <p className="mt-4 rounded-xl bg-red-900/5 px-4 py-3 text-sm text-red-800" role="alert">{state.message ?? "Check the field errors and try again."}</p> : null}

        {revision !== values.revision ? <p role="status" className="mt-3 text-sm">Saved details changed. Reload this page before saving preferences; unsaved entries will need to be re-entered.</p> : null}
        <div className={step === 0 ? "setup-step-fields mt-7" : "hidden"}><WeddingBasicsFields values={values} errors={state.errors} /></div>
        <div className={step === 1 ? "setup-step-fields mt-7" : "hidden"}><WeddingCharacteristicsFields values={values} errors={state.errors} /></div>
        <div className={step === 2 ? "setup-step-fields mt-7" : "hidden"}><WeddingStyleFields values={values} errors={state.errors} /></div>
        <div className={step === 3 ? "setup-step-fields mt-7" : "hidden"}><WeddingPriorityFields values={values} errors={state.errors} /></div>
        <div className={step === 4 ? "setup-step-fields mt-7" : "hidden"}><WeddingBudgetFields values={values} errors={state.errors} /></div>

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
