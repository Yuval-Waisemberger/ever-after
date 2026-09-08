import Link from "next/link";
import { Mail, Pencil, Phone } from "lucide-react";
import { guestSideLabels } from "@/lib/domain/guests";
import type { GuestRow } from "@/lib/queries/guests";
import { GuestStatusPill } from "./guest-status-pill";
import { DeleteGuestButton } from "./delete-guest-button";

function GuestIdentity({ guest }: { guest: GuestRow }) {
  return <div><p className="font-semibold text-ink">{guest.full_name}</p>{guest.party_name ? <p className="mt-0.5 text-xs text-ink-soft">{guest.party_name}</p> : null}</div>;
}

function GuestContact({ guest }: { guest: GuestRow }) {
  if (!guest.phone && !guest.email) return <span className="text-xs text-ink-soft">Not set</span>;
  return <div className="grid gap-1 text-xs">{guest.phone ? <a href={`tel:${guest.phone}`} className="inline-flex items-center gap-1.5 hover:text-wine"><Phone className="size-3.5" aria-hidden="true" />{guest.phone}</a> : null}{guest.email ? <a href={`mailto:${guest.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-wine"><Mail className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{guest.email}</span></a> : null}</div>;
}

function GuestActions({ guest, compact = false }: { guest: GuestRow; compact?: boolean }) {
  return <div className="flex items-center gap-2"><Link href={`/guests?edit=${guest.id}#guest-form`} className={compact ? "grid size-10 place-items-center rounded-full border bg-paper text-wine hover:border-wine" : "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold text-wine hover:border-wine"} aria-label={`Edit ${guest.full_name}`}><Pencil className="size-4" aria-hidden="true" />{compact ? null : "Edit"}</Link><DeleteGuestButton id={guest.id} name={guest.full_name} compact={compact} /></div>;
}

export function GuestList({ guests, partnerOneName, partnerTwoName }: { guests: GuestRow[]; partnerOneName: string | null; partnerTwoName: string | null }) {
  const sideLabels = guestSideLabels(partnerOneName, partnerTwoName);
  return (
    <>
      <div className="guest-list-table hidden overflow-x-auto rounded-xl border bg-paper lg:block">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead className="bg-canvas/70 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Guest / household</th><th className="px-3 py-3">Group</th><th className="px-3 py-3">Side</th><th className="px-3 py-3 text-center">Invited</th><th className="px-3 py-3 text-center">Attending</th><th className="px-3 py-3">RSVP</th><th className="px-3 py-3">Contact</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y">{guests.map((guest) => <tr key={guest.id} id={`guest-${guest.id}`} data-rsvp={guest.rsvp_status} className="guest-state-row align-top"><td className="px-4 py-4"><GuestIdentity guest={guest} /></td><td className="px-3 py-4 text-ink-soft">{guest.guest_group ?? "—"}</td><td className="px-3 py-4 text-ink-soft">{guest.side ? sideLabels[guest.side] : "Not set"}</td><td className="px-3 py-4 text-center font-semibold">{guest.invited_count}</td><td className="px-3 py-4 text-center font-semibold">{guest.attending_count ?? "—"}</td><td className="px-3 py-4"><GuestStatusPill status={guest.rsvp_status} /></td><td className="max-w-44 px-3 py-4"><GuestContact guest={guest} /></td><td className="px-4 py-4"><GuestActions guest={guest} compact /></td></tr>)}</tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:hidden">{guests.map((guest) => <article key={guest.id} id={`guest-card-${guest.id}`} data-rsvp={guest.rsvp_status} className="guest-state-row rounded-xl border p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><GuestIdentity guest={guest} /><GuestStatusPill status={guest.rsvp_status} /></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="text-xs text-ink-soft">Invited / attending</dt><dd className="mt-1 font-semibold">{guest.invited_count} / {guest.attending_count ?? "—"}</dd></div><div><dt className="text-xs text-ink-soft">Side</dt><dd className="mt-1 font-semibold">{guest.side ? sideLabels[guest.side] : "Not set"}</dd></div><div><dt className="text-xs text-ink-soft">Group</dt><dd className="mt-1 font-semibold">{guest.guest_group ?? "Not set"}</dd></div><div className="min-w-0"><dt className="text-xs text-ink-soft">Contact</dt><dd className="mt-1"><GuestContact guest={guest} /></dd></div></dl><div className="mt-4 flex justify-end border-t pt-3"><GuestActions guest={guest} /></div></article>)}</div>
    </>
  );
}
