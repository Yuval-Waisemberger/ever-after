import { calculateTaskSummary } from "@/lib/domain/tasks";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateGuestSummary } from "@/lib/domain/guests";
export async function getCoupleIdentity() { return { avatarChoice: "heart", photoUrl: null }; }
export async function getGuestSummary() {
  return calculateGuestSummary(new URLSearchParams(location.search).has("empty") ? [] : [
    { rsvpStatus: "attending", invitedCount: 60, attendingCount: 58 },
    { rsvpStatus: "invited", invitedCount: 12, attendingCount: null },
    { rsvpStatus: "not_invited", invitedCount: 3, attendingCount: null },
  ]);
}
export async function getWeddingDashboard(now = new Date()) {
  const params = new URLSearchParams(location.search);
  const wedding_date = params.has("noDate") ? null : "2026-09-12";
  const empty = params.has("empty");
  const tasks = empty ? [] : [
    { id: "wait", title: "Final arrival confirmation from our venue team", status: "waiting_on_vendor" as const, priority: "high" as const, dueDate: "2026-09-05" },
    { id: "today", title: "Check the ceremony essentials", status: "in_progress" as const, priority: "medium" as const, dueDate: "2026-09-07" },
    { id: "high", title: "Pack our wedding-day bag", status: "open" as const, priority: "high" as const, dueDate: null },
    { id: "done", title: "Completed fixture task", status: "completed" as const, priority: "high" as const, dueDate: "2026-09-06" },
  ];
  const payment = { itemLabel: "Venue A", label: "Final instalment", amountMinor: 20000, isPaid: false, dueDate: "2026-09-07" };
  const budgetItems = empty ? [] : [
    { id: "active", label: "Venue A", source: "booked_vendor" as const, relationshipStatus: "booked", committedAmountMinor: 10000, payments: [payment] },
    { id: "inactive", label: "Cancelled", source: "booked_vendor" as const, relationshipStatus: "considering", committedAmountMinor: null, payments: [{ ...payment, label: "Inactive schedule" }] },
  ];
  const makeVendor = (name: string) => ({ business_name: name, slug: "fixture", vendor_images: [], vendor_subcategories: { name: "Venue", slug: "wedding-venues" }, vendor_categories: { slug: "venues" } });
  const relationships = empty ? [] : [
    { id: "marketplace", status: "booked", vendor_profiles: makeVendor("The Orchard — a very long venue business name for wrapping"), external_vendors: null },
    { id: "external", status: "booked", vendor_profiles: null, external_vendors: makeVendor("External Venue Team") },
  ];
  return { wedding: { wedding_date, partner_one_name: "Alex", partner_two_name: "Sam", setup_status: "completed", booked_categories: ["Photographer"], venue_status: "looking" },
    tasks, taskSummary: calculateTaskSummary(tasks, now), relationships,
    budget: calculateBudgetSummary(17000000, budgetItems), budgetItems,
  };
}

export async function getOwnedWedding() { return { wedding_date: new URLSearchParams(location.search).has("noDate") ? null : "2026-09-12" }; }
export async function getTasks() {
  return Array.from({ length: 16 }, (_, i) => ({ id: `timeline-${i}`, title: `Planning milestone ${i + 1}`, due_date: i === 15 ? null : `2026-${String(Math.min(9, Math.floor(i / 2) + 1)).padStart(2, "0")}-05`, status: (["open", "in_progress", "waiting_on_vendor", "completed"] as const)[i % 4] }));
}
