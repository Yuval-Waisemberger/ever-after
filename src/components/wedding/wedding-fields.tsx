"use client";
import { useWeddingDraft } from "./wedding-draft";
import type { ComponentProps } from "react";
import { FormField } from "@/components/ui/form-field";
import {
  AREAS,
  EVENT_TYPES,
  WEDDING_PRIORITIES,
  WEDDING_STYLES,
} from "@/lib/validation/wedding";

export type WeddingFieldValues = {
  weddingDate?: string | null;
  venueStatus?: string | null;
  venueName?: string | null;
  guestCount?: number | null;
  preferredArea?: string | null;
  eventType?: string | null;
  styles?: string[];
  priorities?: string[];
  bookedCategories?: string[];
  totalBudgetMinor?: number | null;
  revision?: string;
};

export function WeddingInput(props: ComponentProps<typeof FormField>) {
  const draft = useWeddingDraft();
  if (!draft || !props.name) return <FormField {...props} />;
  const { defaultValue, ...rest } = props;
  void defaultValue;
  return <FormField {...rest} value={String(draft.values[props.name] ?? "")} onChange={event => draft.set(props.name!, event.target.value)} />;
}
function ChoiceGrid({ name, choices, selected = [] }: { name: string; choices: readonly string[]; selected?: readonly string[] }) {
  const draft = useWeddingDraft();
  const checked = (draft?.values[name] ?? selected) as readonly string[];
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{choices.map(choice => <label key={choice} className="ea-choice flex cursor-pointer items-center gap-3 rounded-xl border bg-paper px-3 py-3 text-sm transition has-[:checked]:border-wine has-[:checked]:bg-wine/5"><input type="checkbox" name={name} value={choice} checked={checked.includes(choice)} onChange={event => draft?.set(name, event.target.checked ? [...checked, choice] : checked.filter(c => c !== choice))} className="size-4 accent-wine" /><span>{choice}</span></label>)}</div>;
}

function SelectField({ error, label, name, value, children, emptyLabel = "Not set yet", includeEmpty = true }: { error?: string; label: string; name: string; value?: string | null; children: React.ReactNode; emptyLabel?: string; includeEmpty?: boolean }) {
  const draft = useWeddingDraft();
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <select aria-invalid={Boolean(error)} name={name} value={String(draft?.values[name] ?? value ?? (includeEmpty ? "" : "not_yet"))} onChange={event => draft?.set(name, event.target.value)} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">
        {includeEmpty ? <option value="">{emptyLabel}</option> : null}
        {children}
      </select>
      {error ? <span role="alert" className="text-xs text-red-800">{error}</span> : null}
    </label>
  );
}

type Errors = Record<string, string[] | undefined>;
type FieldsProps = { values?: WeddingFieldValues; errors?: Errors };
export function WeddingBasicsFields({ values = {}, errors = {} }: FieldsProps) {
  return <WeddingInput name="weddingDate" type="date" lang="en-GB" label="Wedding date" defaultValue={values.weddingDate ?? ""} error={errors.weddingDate?.[0]} hint="Day / month / year. Leave blank if the date is not set yet. Manage venue arrangements in the separate vendor section below." />;
}

export function WeddingCharacteristicsFields({ values = {}, errors = {} }: FieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <WeddingInput name="guestCount" type="number" min={1} max={5000} label="Estimated guests" defaultValue={values.guestCount ?? ""} error={errors.guestCount?.[0]} />
      <SelectField error={errors.preferredArea?.[0]} name="preferredArea" label="Preferred area" value={values.preferredArea}>
        {AREAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
      <SelectField error={errors.eventType?.[0]} name="eventType" label="Event type / time" value={values.eventType}>
        {EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
    </div>
  );
}

export function WeddingStyleFields({ values = {}, errors = {} }: FieldsProps) {
  return <fieldset tabIndex={-1} data-field="styles"><legend className="sr-only">Styles</legend><ChoiceGrid name="styles" choices={WEDDING_STYLES} selected={values.styles} />{errors.styles ? <p role="alert">{errors.styles[0]}</p> : null}</fieldset>;
}

export function WeddingPriorityFields({ values = {}, errors = {} }: FieldsProps) {
  return <fieldset tabIndex={-1} data-field="priorities"><legend className="sr-only">Priorities</legend><ChoiceGrid name="priorities" choices={WEDDING_PRIORITIES} selected={values.priorities} />{errors.priorities ? <p role="alert">{errors.priorities[0]}</p> : null}</fieldset>;
}

export function WeddingBudgetFields({ values = {}, errors = {} }: FieldsProps) {
  return (
    <WeddingInput
      error={errors.totalBudgetShekels?.[0]}
      name="totalBudgetShekels"
      type="number"
      min={0}
      step={1}
      label="Estimated total budget (₪)"
      defaultValue={values.totalBudgetMinor == null ? "" : Math.round(values.totalBudgetMinor / 100)}
      hint="Optional. You can define or change this later in Wedding Details or Budget."
    />
  );
}
