"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { saveGuest } from "@/lib/actions/guests";
import { initialActionState } from "@/lib/actions/state";
import { GUEST_RSVP_LABELS, GUEST_RSVP_STATUSES, type GuestRsvpStatus, type GuestSide } from "@/lib/domain/guests";
import { GUEST_GROUP_SUGGESTIONS } from "@/lib/validation/guest";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

export type GuestFormValue = {
  id?: string;
  fullName?: string;
  partyName?: string | null;
  guestGroup?: string | null;
  side?: GuestSide | null;
  phone?: string | null;
  email?: string | null;
  rsvpStatus?: GuestRsvpStatus;
  invitedCount?: number;
  attendingCount?: number | null;
  dietaryNotes?: string | null;
  privateNotes?: string | null;
};

export function GuestForm({ initial = {}, sideLabels }: {
  initial?: GuestFormValue;
  sideLabels: Record<GuestSide, string>;
}) {
  const [state, action, pending] = useActionState(saveGuest, initialActionState);
  const [clearedState, setClearedState] = useState<typeof state | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<GuestRsvpStatus>(initial.rsvpStatus ?? "not_invited");
  const [invitedCount, setInvitedCount] = useState(initial.invitedCount ?? 1);
  const feedback = state === clearedState ? initialActionState : state;
  const error = (name: string) => feedback.errors?.[name]?.[0];

  return (
    <form action={action} className="guest-form grid gap-6">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {feedback.message ? <p className={`ea-feedback ${feedback.status === "error" ? "ea-feedback--error" : "ea-feedback--success"}`} role="status">{feedback.message}</p> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField name="fullName" label="Guest / primary contact name" required maxLength={160} defaultValue={initial.fullName ?? ""} error={error("fullName")} />
        <FormField name="partyName" label="Party / household name" maxLength={120} defaultValue={initial.partyName ?? ""} placeholder="Cohen Family" error={error("partyName")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="ea-field grid gap-2 text-sm font-medium">
          <label htmlFor={`guest-group-${initial.id ?? "new"}`}>Guest group</label>
          <input id={`guest-group-${initial.id ?? "new"}`} name="guestGroup" list="guest-group-suggestions" maxLength={80} defaultValue={initial.guestGroup ?? ""} placeholder="Family, Friends, Work…" className="ea-input min-h-11 rounded-xl border bg-paper px-3.5 py-2.5 text-base font-normal" />
          <datalist id="guest-group-suggestions">{GUEST_GROUP_SUGGESTIONS.map((group) => <option key={group} value={group} />)}</datalist>
          {error("guestGroup") ? <span className="ea-field-error text-xs" role="alert">{error("guestGroup")}</span> : null}
        </div>
        <label className="grid gap-2 text-sm font-medium">Side
          <select name="side" defaultValue={initial.side ?? ""} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">
            <option value="">Not set</option>
            <option value="partner_one">{sideLabels.partner_one}</option>
            <option value="partner_two">{sideLabels.partner_two}</option>
            <option value="both">{sideLabels.both}</option>
          </select>
          {error("side") ? <span className="ea-field-error text-xs" role="alert">{error("side")}</span> : null}
        </label>
        <FormField name="invitedCount" type="number" min={1} max={20} step={1} label="Invited count" required value={invitedCount} onChange={(event) => setInvitedCount(Number(event.target.value))} error={error("invitedCount")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">RSVP
          <select name="rsvpStatus" value={rsvpStatus} onChange={(event) => setRsvpStatus(event.target.value as GuestRsvpStatus)} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">
            {GUEST_RSVP_STATUSES.map((status) => <option key={status} value={status}>{GUEST_RSVP_LABELS[status]}</option>)}
          </select>
        </label>
        {rsvpStatus === "attending" ? (
          <FormField name="attendingCount" type="number" min={1} max={Math.max(1, invitedCount)} step={1} label="Attending count" required defaultValue={initial.attendingCount ?? 1} error={error("attendingCount")} />
        ) : rsvpStatus === "not_attending" ? (
          <div className="rounded-xl border bg-canvas/60 px-4 py-3 text-sm text-ink-soft"><span className="block font-semibold text-ink">Attending</span><span className="mt-1 block">0 confirmed</span></div>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField name="phone" type="tel" label="Phone" maxLength={40} autoComplete="tel" defaultValue={initial.phone ?? ""} error={error("phone")} />
        <FormField name="email" type="email" label="Email" maxLength={254} autoComplete="email" defaultValue={initial.email ?? ""} error={error("email")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Dietary notes
          <textarea name="dietaryNotes" rows={3} maxLength={2000} defaultValue={initial.dietaryNotes ?? ""} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" />
          {error("dietaryNotes") ? <span className="ea-field-error text-xs" role="alert">{error("dietaryNotes")}</span> : null}
        </label>
        <label className="grid gap-2 text-sm font-medium">Private notes
          <textarea name="privateNotes" rows={3} maxLength={3000} defaultValue={initial.privateNotes ?? ""} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" />
          {error("privateNotes") ? <span className="ea-field-error text-xs" role="alert">{error("privateNotes")}</span> : null}
        </label>
      </div>

      <div className="guest-form-actions">
        <button type="button" className="guest-form-clear" disabled={pending} onClick={(event) => {
          event.currentTarget.form?.reset();
          setRsvpStatus(initial.rsvpStatus ?? "not_invited");
          setInvitedCount(initial.invitedCount ?? 1);
          setClearedState(state);
        }}>Clear</button>
        <SubmitButton className="justify-self-start" pendingLabel="Saving guest…"><Save className="size-4" />{initial.id ? "Save changes" : "Add guest"}</SubmitButton>
      </div>
    </form>
  );
}
