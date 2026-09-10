import { calculateTaskSummary } from "@/lib/domain/tasks";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateGuestSummary } from "@/lib/domain/guests";
export async function getCoupleIdentity() { return { avatarChoice: "heart", photoUrl: new URLSearchParams(location.search).has("reference") ? "/images/auth/couple-petals.webp" : null }; }
export async function getGuestSummary() {
  return calculateGuestSummary(new URLSearchParams(location.search).has("empty") || new URLSearchParams(location.search).has("reference") ? [] : [
    { rsvpStatus: "attending", invitedCount: 60, attendingCount: 58 },
    { rsvpStatus: "invited", invitedCount: 12, attendingCount: null },
    { rsvpStatus: "not_invited", invitedCount: 3, attendingCount: null },
  ]);
}
export async function getWeddingDashboard(now = new Date()) {
  const params = new URLSearchParams(location.search);
  const reference = params.has("reference");
  const wedding_date = params.has("noDate") ? null : reference ? "2026-12-12" : "2026-09-12";
  const empty = params.has("empty");
  const tasks = empty ? [] : [
    { id: "wait", title: "Final arrival confirmation from our venue team", status: "waiting_on_vendor" as const, priority: "high" as const, dueDate: "2026-09-05" },
    { id: "today", title: "Check the ceremony essentials", status: "in_progress" as const, priority: "medium" as const, dueDate: "2026-09-07" },
    { id: "high", title: "Pack our wedding-day bag", status: "open" as const, priority: "high" as const, dueDate: null },
    { id: "done", title: "Completed fixture task", status: "completed" as const, priority: "high" as const, dueDate: "2026-09-06" },
  ];
  if (reference) tasks.forEach(task => { if (task.dueDate) task.dueDate = "2026-12-01"; });
  const payment = { itemLabel: "Venue A", label: "Final instalment", amountMinor: 20000, isPaid: false, dueDate: "2026-09-07" };
  const budgetItems = empty ? [] : [
    { id: "active", label: "Venue A", source: "booked_vendor" as const, relationshipStatus: "booked", committedAmountMinor: 10000, payments: [payment] },
    { id: "inactive", label: "Cancelled", source: "booked_vendor" as const, relationshipStatus: "considering", committedAmountMinor: null, payments: [{ ...payment, label: "Inactive schedule" }] },
  ];
  if (reference) {
    budgetItems[0].committedAmountMinor = 6000000;
    budgetItems[0].payments = [{ ...payment, amountMinor: 3000000, isPaid: true }];
    budgetItems[1].payments = [];
  }
  const makeVendor = (name: string) => ({ business_name: name, slug: "fixture", vendor_images: reference ? [{ external_url: "/demo-marketplace/wedding-venues/wedding-venues-01.webp", storage_path: null, is_primary: true, alt_text: "Synthetic vendor fixture photo" }] : [], vendor_subcategories: { name: "Venue", slug: "wedding-venues" }, vendor_categories: { slug: "venues" } });
  const relationships = empty ? [] : [
    { id: "marketplace", status: "booked", vendor_profiles: makeVendor("The Orchard — a very long venue business name for wrapping"), external_vendors: null },
    { id: "external", status: "booked", vendor_profiles: null, external_vendors: makeVendor("External Venue Team") },
  ];
  if (reference) relationships.push({ id: "third", status: "booked", vendor_profiles: makeVendor("Studio Three"), external_vendors: null });
  return { wedding: { wedding_date, partner_one_name: "Alex", partner_two_name: "Sam", setup_status: "completed", booked_categories: ["Photographer"], venue_status: "looking" },
    tasks, taskSummary: calculateTaskSummary(tasks, now), relationships,
    budget: calculateBudgetSummary(17000000, budgetItems), budgetItems,
  };
}

export async function getOwnedWedding() { return { wedding_date: new URLSearchParams(location.search).has("noDate") ? null : "2026-09-12" }; }
export async function getTasks() {
  if (new URLSearchParams(location.search).has("chronology")) return [
    { id: "after", title: "Return rented items", due_date: "2026-09-14", status: "open" as const },
    { id: "same", title: "Check ceremony essentials", due_date: "2026-09-12", status: "open" as const },
    { id: "before", title: "Confirm vendor arrivals", due_date: "2026-09-10", status: "in_progress" as const },
    { id: "undated", title: "Choose album photos", due_date: null, status: "open" as const },
  ];
  return Array.from({ length: 16 }, (_, i) => ({ id: `timeline-${i}`, title: `Planning milestone ${i + 1}`, due_date: i === 15 ? null : `2026-${String(Math.min(9, Math.floor(i / 2) + 1)).padStart(2, "0")}-05`, status: (["open", "in_progress", "waiting_on_vendor", "completed"] as const)[i % 4] }));
}
