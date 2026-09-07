import { calculateBudgetSummary } from "@/lib/domain/budget";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "./wedding";

export async function getBudgetPageData() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data: items, error } = await supabase.from("budget_items")
    .select("id, label, category, source, couple_vendors(status, vendor_profiles(business_name), external_vendors(business_name)), estimated_amount_minor, committed_amount_minor, notes, couple_vendor_id, payments(id, label, amount_minor, due_date, is_paid, paid_at, notes)")
    .eq("wedding_id", wedding.id).order("created_at");
  if (error || !items) throw new Error("Budget could not be loaded.");
  if (items.some(item => !item.payments)) throw new Error("Payments could not be loaded.");
  const normalizedItems = items.map((item) => ({
    ...item,
    estimated_amount_minor: item.estimated_amount_minor == null ? null : Number(item.estimated_amount_minor),
    committed_amount_minor: item.committed_amount_minor == null ? null : Number(item.committed_amount_minor),
    payments: (item.payments ?? []).map((payment) => ({ ...payment, amount_minor: Number(payment.amount_minor) })),
  }));
  const summary = calculateBudgetSummary(
    wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor),
    normalizedItems.map((item) => ({
      source: item.source as "manual" | "booked_vendor",
      relationshipStatus: (Array.isArray(item.couple_vendors) ? item.couple_vendors[0] : item.couple_vendors)?.status ?? null,
      estimatedAmountMinor: item.estimated_amount_minor,
      committedAmountMinor: item.committed_amount_minor,
      payments: item.payments.map((payment) => ({ amountMinor: payment.amount_minor, isPaid: payment.is_paid, dueDate: payment.due_date })),
    })),
  );
  return { wedding, items: normalizedItems, summary };
}
