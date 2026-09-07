"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { budgetItemSchema, entityIdSchema, paymentSchema, totalBudgetSchema } from "@/lib/validation/budget";
import { formObject, type ActionState } from "./state";

function refreshBudget() {
  for (const path of ["/budget", "/wedding", "/vendors", "/vendors/my", "/assistant"]) revalidatePath(path);
}
const failed = (message: string): ActionState => ({ status: "error", message });

export async function setTotalBudget(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = totalBudgetSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data, error } = await supabase.from("weddings")
    .update({ total_budget_minor: parsed.data.totalBudgetShekels == null ? null : parsed.data.totalBudgetShekels * 100 })
    .eq("id", wedding.id).select("id").single();
  if (error || !data) return failed("The total budget could not be saved.");
  refreshBudget();
  return { status: "success", message: "Total budget updated." };
}

export async function saveBudgetItem(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const raw = formObject(formData);
  const identity = raw.id ? entityIdSchema.safeParse({ id: raw.id }) : null;
  if (identity && !identity.success) return failed("This expense could not be found.");
  const existing = identity?.success
    ? await supabase.from("budget_items").select("id, source, couple_vendor_id, committed_amount_minor")
      .eq("id", identity.data.id).eq("wedding_id", wedding.id).single()
    : null;
  if (existing && (existing.error || !existing.data)) return failed("This expense could not be loaded.");
  const canonical = existing?.data?.source === "booked_vendor";
  if (raw.source != null || (canonical && (raw.coupleVendorId != null || raw.committedShekels != null))) {
    return failed("Change the booking commitment from vendor details.");
  }
  if (!canonical && raw.coupleVendorId) return failed("Vendor commitments are created from vendor details. Add a separate manual expense here.");
  const parsed = budgetItemSchema.safeParse({
    ...raw, coupleVendorId: "",
    ...(canonical ? { committedShekels: existing!.data!.committed_amount_minor == null ? null : Number(existing!.data!.committed_amount_minor) / 100 } : {}),
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const editable = {
    label: parsed.data.label, category: parsed.data.category, notes: parsed.data.notes,
    estimated_amount_minor: parsed.data.estimatedShekels == null ? null : parsed.data.estimatedShekels * 100,
  };
  const values = canonical ? editable : {
    ...editable, wedding_id: wedding.id, couple_vendor_id: null,
    committed_amount_minor: parsed.data.committedShekels == null ? null : parsed.data.committedShekels * 100,
  };
  const mutation = parsed.data.id
    ? supabase.from("budget_items").update(values).eq("id", parsed.data.id).eq("wedding_id", wedding.id)
    : supabase.from("budget_items").insert(values);
  const { data, error } = await mutation.select("id").single();
  if (error || !data) return failed("The expense could not be saved. Booking commitments are managed from vendor details.");
  refreshBudget();
  return { status: "success", message: parsed.data.id ? "Expense updated." : "Expense added." };
}

export async function deleteBudgetItem(formData: FormData) {
  const parsed = entityIdSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/budget?error=expense");
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data: item, error: readError } = await supabase.from("budget_items")
    .select("source, payments(id)").eq("id", parsed.data.id).eq("wedding_id", wedding.id).single();
  if (readError || !item) redirect("/budget?error=expense");
  if (item.source === "booked_vendor" || !item.payments || item.payments.length) redirect("/budget?error=history");
  const { data, error } = await supabase.from("budget_items").delete().eq("id", parsed.data.id).eq("wedding_id", wedding.id).select("id").single();
  if (error || !data) redirect("/budget?error=history");
  refreshBudget();
}

export async function savePayment(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = paymentSchema.safeParse({ ...formObject(formData), isPaid: formData.get("isPaid") === "on" });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase.from("budget_items").select("committed_amount_minor")
    .eq("id", parsed.data.budgetItemId).eq("wedding_id", wedding.id).single();
  if (itemError || !item) return failed("The payment expense could not be loaded.");
  const { data: existing, error: paymentError } = await supabase.from("payments")
    .select("id, amount_minor, is_paid, paid_at").eq("budget_item_id", parsed.data.budgetItemId);
  if (paymentError || !existing) return failed("Existing payments could not be checked. Please try again.");
  const prior = parsed.data.id ? existing.find((p) => p.id === parsed.data.id) : null;
  if (parsed.data.id && !prior) return failed("This payment could not be found.");
  if (parsed.data.amountShekels == null) return failed("Enter a payment amount.");
  const amountMinor = parsed.data.amountShekels * 100;
  const increasesSchedule = !prior || amountMinor > Number(prior.amount_minor);
  if (increasesSchedule) {
    if (!item.committed_amount_minor) return failed("Set an active committed amount before adding payments.");
    const scheduled = existing.reduce((sum, p) => sum + (p.id === parsed.data.id ? 0 : Number(p.amount_minor)), 0);
    if (scheduled + amountMinor > Number(item.committed_amount_minor)) return failed("Scheduled payments cannot exceed the active commitment.");
  }
  const values = {
    budget_item_id: parsed.data.budgetItemId, label: parsed.data.label, amount_minor: amountMinor,
    due_date: parsed.data.dueDate, is_paid: parsed.data.isPaid,
    paid_at: parsed.data.isPaid ? (prior?.is_paid ? prior.paid_at : new Date().toISOString()) : null,
    notes: parsed.data.notes,
  };
  const mutation = parsed.data.id
    ? supabase.from("payments").update(values).eq("id", parsed.data.id).eq("budget_item_id", parsed.data.budgetItemId)
    : supabase.from("payments").insert(values);
  const { data, error } = await mutation.select("id").single();
  // The DB parent lock and trigger are authoritative if another request raced this check.
  if (error || !data) return failed("The payment could not be saved. Refresh the budget and review its active commitment.");
  refreshBudget();
  return { status: "success", message: parsed.data.isPaid ? "Payment saved as paid." : "Payment scheduled." };
}

async function ownedPayment(id: string) {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data, error } = await supabase.from("payments").select("id, budget_item_id, is_paid, paid_at, budget_items!inner(wedding_id)")
    .eq("id", id).eq("budget_items.wedding_id", wedding.id).single();
  if (error || !data) redirect("/budget?error=payment");
  return { supabase, payment: data };
}
export async function togglePaymentPaid(formData: FormData) {
  const parsed = entityIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/budget?error=payment");
  const { supabase, payment } = await ownedPayment(parsed.data.id);
  const isPaid = formData.get("paid") === "true";
  const { data, error } = await supabase.from("payments")
    .update({ is_paid: isPaid, paid_at: isPaid ? (payment.is_paid ? payment.paid_at : new Date().toISOString()) : null })
    .eq("id", parsed.data.id).eq("budget_item_id", payment.budget_item_id).select("id").single();
  if (error || !data) redirect("/budget?error=payment");
  refreshBudget();
}
export async function deletePayment(formData: FormData) {
  const parsed = entityIdSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/budget?error=payment");
  const { supabase, payment } = await ownedPayment(parsed.data.id);
  const { data, error } = await supabase.from("payments").delete()
    .eq("id", parsed.data.id).eq("budget_item_id", payment.budget_item_id).select("id").single();
  if (error || !data) redirect("/budget?error=payment");
  refreshBudget();
}
