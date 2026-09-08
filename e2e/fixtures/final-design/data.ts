import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateGuestSummary } from "@/lib/domain/guests";
import type { CoupleAvatarChoice } from "@/lib/domain/couple-identity";
import type { GuestRow } from "@/lib/queries/guests";
import { demoVendors } from "@/lib/vendors/demo";

const empty = () => new URLSearchParams(location.search).has("empty");
const wedding = { partner_one_name: "Alex", partner_two_name: "Sam", guest_count: 120, total_budget_minor: 17000000 };
let choice: CoupleAvatarChoice = "heart";
const denied = async () => ({ status: "error" as const, message: "This action is disabled in the isolated visual fixture." });
export const changePassword = denied, signOut = denied, saveGuest = denied, deleteGuest = denied,
  saveBudgetItem = denied, savePayment = denied, setTotalBudget = denied, deleteBudgetItem = denied,
  deletePayment = denied, togglePaymentPaid = denied, deleteReview = denied, removeCouplePhoto = denied, saveCouplePhoto = denied;
export function createClient(): never { throw new Error("Storage disabled in visual fixture"); }
export async function chooseCoupleAvatar(value: CoupleAvatarChoice) {
  if (new URLSearchParams(location.search).has("fail")) return denied();
  choice = value;
  return { status: "success" as const, message: "Couple icon updated." };
}
export async function getCoupleIdentity() { return { profileId: "fixture", avatarChoice: choice, avatarStoragePath: null, photoUrl: null }; }
export async function getMyReviews() {
  return empty() ? [] : demoVendors.slice(0, 3).map((vendor, index) => ({
    id: `review-${index}`, vendor_id: vendor.id, professionalism: 4, punctuality: 5, service_attitude: 4, value_for_money: 4,
    would_choose_again: true, review_text: index === 1 ? "תודה על יום יפה ועל תשומת הלב לכל הפרטים." : "Thoughtful communication and a calm presence throughout our day. We appreciated the care in every detail.",
    updated_at: "2026-09-07T12:00:00Z", vendor_profiles: { business_name: vendor.businessName, slug: vendor.slug, vendor_images: [{ external_url: vendor.imageUrl, storage_path: null, is_primary: true, alt_text: vendor.businessName }] },
  }));
}
export async function getOwnedGuest() { return null; }
export async function getGuestList() {
  const guests: GuestRow[] = empty() ? [] : ["Alex Morgan household", "Sam Taylor", "נועה ועמית"].map((full_name, index) => ({
    id: `guest-${index}`, full_name, party_name: index === 0 ? "Morgan family" : null, guest_group: "Friends", side: null,
    phone: null, email: null, rsvp_status: index === 0 ? "attending" : "invited", invited_count: 2, attending_count: index === 0 ? 2 : null,
    dietary_notes: null, private_notes: null, created_at: "2026-09-07", updated_at: "2026-09-07",
  }));
  return { wedding, guests, total: guests.length, page: 1, pageCount: 1, groups: ["Friends"], summary: calculateGuestSummary(guests.map(g => ({ rsvpStatus: g.rsvp_status, invitedCount: g.invited_count, attendingCount: g.attending_count }))) };
}
export async function getBudgetPageData() {
  const items = empty() ? [] : [{ id: "expense", label: "Willow Studio photography", category: "Photography", source: "booked_vendor", notes: null, couple_vendor_id: "relationship",
    couple_vendors: { status: "booked", vendor_profiles: { business_name: "Willow Studio" }, external_vendors: null }, estimated_amount_minor: 1400000, committed_amount_minor: 1200000,
    payments: [{ id: "payment", label: "Final instalment", amount_minor: 600000, due_date: "2027-02-01", is_paid: false, paid_at: null, notes: null }] }];
  return { wedding, items, summary: calculateBudgetSummary(wedding.total_budget_minor, items.map(i => ({ source: "booked_vendor", relationshipStatus: "booked", estimatedAmountMinor: i.estimated_amount_minor, committedAmountMinor: i.committed_amount_minor, payments: i.payments.map(p => ({ amountMinor: p.amount_minor, isPaid: p.is_paid, dueDate: p.due_date })) }))) };
}
