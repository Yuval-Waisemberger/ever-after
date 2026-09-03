import { calculateBudgetSummary } from "@/lib/domain/budget";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "./wedding";

export async function getBudgetPageData() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const [{ data: items, error }, { data: booked }] = await Promise.all([
    supabase
      .from("budget_items")
      .select("id, label, category, estimated_amount_minor, committed_amount_minor, notes, couple_vendor_id, payments(id, label, amount_minor, due_date, is_paid, paid_at, notes)")
      .eq("wedding_id", wedding.id)
      .order("created_at"),
    supabase
      .from("couple_vendors")
      .select("id, agreed_price_minor, vendor_profiles(business_name)")
      .eq("wedding_id", wedding.id)
      .eq("status", "booked"),
  ]);
  if (error) throw new Error("Budget could not be loaded.");
  const normalizedItems = (items ?? []).map((item) => ({
    ...item,
    estimated_amount_minor: item.estimated_amount_minor == null ? null : Number(item.estimated_amount_minor),
    committed_amount_minor: item.committed_amount_minor == null ? null : Number(item.committed_amount_minor),
    payments: (item.payments ?? []).map((payment) => ({ ...payment, amount_minor: Number(payment.amount_minor) })),
  }));
  const summary = calculateBudgetSummary(
    wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor),
    normalizedItems.map((item) => ({
      estimatedAmountMinor: item.estimated_amount_minor,
      committedAmountMinor: item.committed_amount_minor,
      payments: item.payments.map((payment) => ({ amountMinor: payment.amount_minor, isPaid: payment.is_paid, dueDate: payment.due_date })),
    })),
  );
  return { wedding, items: normalizedItems, booked: booked ?? [], summary };
}
