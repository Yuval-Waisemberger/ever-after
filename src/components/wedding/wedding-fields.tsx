import { ChoiceGrid } from "@/components/ui/choice-grid";
import { FormField } from "@/components/ui/form-field";
import {
  AREAS,
  BOOKED_CATEGORIES,
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
};

function SelectField({ label, name, value, children }: { label: string; name: string; value?: string | null; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <select name={name} defaultValue={value ?? ""} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">
        <option value="">Not set</option>
        {children}
      </select>
    </label>
  );
}

export function WeddingBasicsFields({ values = {} }: { values?: WeddingFieldValues }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField name="weddingDate" type="date" label="Wedding date" defaultValue={values.weddingDate ?? ""} />
        <SelectField name="venueStatus" label="Venue status" value={values.venueStatus}>
          <option value="booked">Booked</option>
          <option value="looking">Currently looking</option>
          <option value="not_yet">Not yet</option>
        </SelectField>
      </div>
      <FormField name="venueName" label="Venue name (if booked)" defaultValue={values.venueName ?? ""} />
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold">What is already booked?</legend>
        <ChoiceGrid name="bookedCategories" choices={BOOKED_CATEGORIES} selected={values.bookedCategories} />
      </fieldset>
    </div>
  );
}

export function WeddingCharacteristicsFields({ values = {} }: { values?: WeddingFieldValues }) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <FormField name="guestCount" type="number" min={1} max={5000} label="Estimated guests" defaultValue={values.guestCount ?? ""} />
      <SelectField name="preferredArea" label="Preferred area" value={values.preferredArea}>
        {AREAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
      <SelectField name="eventType" label="Event type / time" value={values.eventType}>
        {EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
    </div>
  );
}

export function WeddingStyleFields({ values = {} }: { values?: WeddingFieldValues }) {
  return <ChoiceGrid name="styles" choices={WEDDING_STYLES} selected={values.styles} />;
}

export function WeddingPriorityFields({ values = {} }: { values?: WeddingFieldValues }) {
  return <ChoiceGrid name="priorities" choices={WEDDING_PRIORITIES} selected={values.priorities} />;
}

export function WeddingBudgetFields({ values = {} }: { values?: WeddingFieldValues }) {
  return (
    <FormField
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
