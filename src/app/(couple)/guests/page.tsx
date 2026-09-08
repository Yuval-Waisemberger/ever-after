import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, UserPlus } from "lucide-react";
import { GuestForm } from "@/components/guests/guest-form";
import { GuestSummary } from "@/components/guests/guest-summary";
import { GuestList } from "@/components/guests/guest-list";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GUEST_RSVP_LABELS, GUEST_RSVP_STATUSES, GUEST_SIDES, guestSideLabels, type GuestRsvpStatus, type GuestSide } from "@/lib/domain/guests";
import { getGuestList, getOwnedGuest } from "@/lib/queries/guests";

export const metadata: Metadata = { title: "Guest List" };

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page"); else next.set("page", String(page));
  const query = next.toString();
  return query ? `/guests?${query}` : "/guests";
}

export default async function GuestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const search = one(raw.search).trim().slice(0, 120);
  const rsvpValue = one(raw.rsvp);
  const sideValue = one(raw.side);
  const group = one(raw.group).trim().slice(0, 80);
  const rsvp = GUEST_RSVP_STATUSES.includes(rsvpValue as GuestRsvpStatus) ? rsvpValue as GuestRsvpStatus : undefined;
  const side = GUEST_SIDES.includes(sideValue as GuestSide) ? sideValue as GuestSide : undefined;
  const page = Math.max(1, Number.parseInt(one(raw.page), 10) || 1);
  const editId = one(raw.edit);
  const adding = one(raw.add) === "1";
  const [{ wedding, guests, total, page: currentPage, pageCount, summary, groups }, editGuest] = await Promise.all([
    getGuestList({ search, rsvp, group: group || undefined, side, page }),
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(editId) ? getOwnedGuest(editId) : Promise.resolve(null),
  ]);
  const sideLabels = guestSideLabels(wedding.partner_one_name, wedding.partner_two_name);
  const activeFilters = new URLSearchParams();
  if (search) activeFilters.set("search", search);
  if (rsvp) activeFilters.set("rsvp", rsvp);
  if (group) activeFilters.set("group", group);
  if (side) activeFilters.set("side", side);
  const hasFilters = Boolean(search || rsvp || group || side);
  const estimate = wedding.guest_count == null ? null : Number(wedding.guest_count);

  return (
    <main className="guest-planning-page mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Plan your invitations" title="Your Guest List" description="Keep invitation parties, household counts, and replies together." action={<Link href="/guests?add=1#guest-form" className="ea-button ea-button--primary"><UserPlus className="size-4" aria-hidden="true" />Add guest / household</Link>} />
      {one(raw.guest) === "added" ? <p className="ea-feedback ea-feedback--success mt-5" role="status">Guest added.</p> : one(raw.guest) === "updated" ? <p className="ea-feedback ea-feedback--success mt-5" role="status">Guest updated.</p> : null}

      <GuestSummary summary={summary} estimate={estimate} />

      <details id="guest-form" className="mt-8 scroll-mt-6 rounded-xl border bg-paper p-5 sm:p-7" open={Boolean(editGuest) || adding || summary.invitationParties === 0}>
        <summary className="cursor-pointer font-display text-2xl text-wine">{editGuest ? `Edit ${editGuest.full_name}` : "Add guest / household"}</summary>
        <div className="mt-6"><GuestForm key={editGuest?.id ?? "new"} sideLabels={sideLabels} initial={editGuest ? { id: editGuest.id, fullName: editGuest.full_name, partyName: editGuest.party_name, guestGroup: editGuest.guest_group, side: editGuest.side, phone: editGuest.phone, email: editGuest.email, rsvpStatus: editGuest.rsvp_status, invitedCount: editGuest.invited_count, attendingCount: editGuest.attending_count, dietaryNotes: editGuest.dietary_notes, privateNotes: editGuest.private_notes } : {}} /></div>
        {editGuest ? <Link href="/guests" className="mt-5 inline-flex text-sm font-semibold text-ink-soft hover:text-wine">Cancel editing</Link> : null}
      </details>

      <section className="mt-8" aria-labelledby="guest-list-heading">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div><h2 id="guest-list-heading" className="font-display text-3xl">Invitation parties</h2><p className="mt-1 text-sm text-ink-soft">{total} {total === 1 ? "result" : "results"}{hasFilters ? " for these filters" : ""}</p></div>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Search and filter guests">
            <label className="grid gap-1 text-xs font-semibold">Search<input type="search" name="search" defaultValue={search} placeholder="Guest or household" maxLength={120} className="min-h-11 rounded-xl border bg-paper px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-semibold">RSVP<select name="rsvp" defaultValue={rsvp ?? ""} className="min-h-11 rounded-xl border bg-paper px-3 text-sm font-normal"><option value="">All replies</option>{GUEST_RSVP_STATUSES.map((status) => <option key={status} value={status}>{GUEST_RSVP_LABELS[status]}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-semibold">Group<select name="group" defaultValue={group} className="min-h-11 rounded-xl border bg-paper px-3 text-sm font-normal"><option value="">All groups</option>{groups.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-semibold">Side<select name="side" defaultValue={side ?? ""} className="min-h-11 rounded-xl border bg-paper px-3 text-sm font-normal"><option value="">All sides</option>{GUEST_SIDES.map((value) => <option key={value} value={value}>{sideLabels[value]}</option>)}</select></label>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end"><button className="ea-button ea-button--primary">Apply filters</button>{hasFilters ? <Link href="/guests" className="ea-button border bg-paper text-ink">Clear</Link> : null}</div>
          </form>
        </div>

        <div className="mt-6">
          {guests.length ? <GuestList guests={guests} partnerOneName={wedding.partner_one_name} partnerTwoName={wedding.partner_two_name} /> : <EmptyState title={hasFilters ? "No guests match these filters" : "Start your guest list"} description={hasFilters ? "Try a different search, group, side, or RSVP filter." : "Add an individual, couple, family, or household when you are ready."} action={hasFilters ? <Link href="/guests" className="ea-button border bg-paper text-ink">Clear filters</Link> : <Link href="/guests?add=1#guest-form" className="ea-button ea-button--primary">Add your first guest</Link>} />}
        </div>

        {pageCount > 1 ? <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Guest List pagination"><Link href={pageHref(activeFilters, currentPage - 1)} aria-disabled={currentPage <= 1} className={`ea-button border bg-paper text-ink ${currentPage <= 1 ? "pointer-events-none opacity-45" : ""}`}><ArrowLeft className="size-4" aria-hidden="true" />Previous</Link><span className="text-sm text-ink-soft">Page {currentPage} of {pageCount}</span><Link href={pageHref(activeFilters, currentPage + 1)} aria-disabled={currentPage >= pageCount} className={`ea-button border bg-paper text-ink ${currentPage >= pageCount ? "pointer-events-none opacity-45" : ""}`}>Next<ArrowRight className="size-4" aria-hidden="true" /></Link></nav> : null}
      </section>
    </main>
  );
}
