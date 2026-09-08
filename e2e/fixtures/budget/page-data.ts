import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateGuestSummary } from "@/lib/domain/guests";
import type { GuestRow } from "@/lib/queries/guests";

const items = [{ id: "fixture-expense", source: "booked_vendor", couple_vendor_id: "fixture-relationship", label: "Cedar Photography", category: "Photography", estimated_amount_minor: 1500000, committed_amount_minor: 1200000, notes: "", couple_vendors: { status: "booked", external_vendors: { business_name: "Cedar Photography" }, vendor_profiles: null }, payments: [{ id: "fixture-payment", label: "Deposit", amount_minor: 300000, is_paid: true, due_date: "2026-08-01", notes: "" }, { id: "fixture-final", label: "Final balance", amount_minor: 900000, is_paid: false, due_date: "2027-03-15", notes: "" }] }];
export async function getBudgetPageData() {
  return { wedding: { total_budget_minor: 17000000 }, items, summary: calculateBudgetSummary(17000000, items.map(item => ({ source: "booked_vendor", relationshipStatus: "booked", committedAmountMinor: item.committed_amount_minor, estimatedAmountMinor: item.estimated_amount_minor, payments: item.payments.map(p => ({ amountMinor: p.amount_minor, isPaid: p.is_paid, dueDate: p.due_date })) }))) };
}
const guests: GuestRow[] = [
  { id: "fixture-one", full_name: "Alex and Morgan", party_name: "River household", rsvp_status: "attending", invited_count: 4, attending_count: 4 },
  { id: "fixture-two", full_name: "Robin Lane", party_name: null, rsvp_status: "invited", invited_count: 2, attending_count: null },
  { id: "fixture-three", full_name: "Jordan Park", party_name: null, rsvp_status: "not_attending", invited_count: 1, attending_count: 0 },
  { id: "fixture-four", full_name: "Casey and Taylor", party_name: "Hill household", rsvp_status: "attending", invited_count: 3, attending_count: 2 },
].map(g => ({ ...g, rsvp_status: g.rsvp_status as GuestRow["rsvp_status"], side: "both" as const, guest_group: "Friends", phone: null, email: null, dietary_notes: null, private_notes: null, created_at: "2026-09-01", updated_at: "2026-09-01" }));
export async function getGuestList() {
  return { wedding: { partner_one_name: "Sam", partner_two_name: "Lee", guest_count: 150 }, guests, total: guests.length, page: 1, pageCount: 1, groups: ["Friends"], summary: calculateGuestSummary(guests.map(g => ({ rsvpStatus: g.rsvp_status, invitedCount: g.invited_count, attendingCount: g.attending_count }))) };
}
export async function getOwnedGuest() { return null; }
