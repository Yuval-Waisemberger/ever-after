"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { budgetItemSchema, entityIdSchema, paymentSchema, totalBudgetSchema } from "@/lib/validation/budget";
import { formObject, type ActionState } from "./state";

function refreshBudget() {
  revalidatePath("/budget");
  revalidatePath("/wedding");
  revalidatePath("/assistant");
}

export async function setTotalBudget(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = totalBudgetSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { error } = await supabase
    .from("weddings")
    .update({ total_budget_minor: parsed.data.totalBudgetShekels == null ? null : parsed.data.totalBudgetShekels * 100 })
    .eq("id", wedding.id);
  if (error) return { status: "error", message: "The total budget could not be saved." };
  refreshBudget();
  return { status: "success", message: "Total budget updated." };
}

export async function saveBudgetItem(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = budgetItemSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const values = {
    wedding_id: wedding.id,
    couple_vendor_id: parsed.data.coupleVendorId,
    label: parsed.data.label,
    category: parsed.data.category,
    estimated_amount_minor: parsed.data.estimatedShekels == null ? null : parsed.data.estimatedShekels * 100,
    committed_amount_minor: parsed.data.committedShekels == null ? null : parsed.data.committedShekels * 100,
    notes: parsed.data.notes,
  };
  const result = parsed.data.id
    ? await supabase.from("budget_items").update(values).eq("id", parsed.data.id).eq("wedding_id", wedding.id)
    : await supabase.from("budget_items").insert(values);
  if (result.error) return { status: "error", message: "The expense could not be saved." };
  refreshBudget();
  return { status: "success", message: parsed.data.id ? "Expense updated." : "Expense added." };
}

export async function deleteBudgetItem(formData: FormData) {
  const parsed = entityIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  await supabase.from("budget_items").delete().eq("id", parsed.data.id).eq("wedding_id", wedding.id);
  refreshBudget();
}

export async function savePayment(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = paymentSchema.safeParse({ ...formObject(formData), isPaid: formData.get("isPaid") === "on" });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data: item } = await supabase.from("budget_items").select("committed_amount_minor").eq("id", parsed.data.budgetItemId).single();
  if (!item?.committed_amount_minor) return { status: "error", message: "Set a committed amount before adding payments." };
  let paymentQuery = supabase.from("payments").select("id, amount_minor").eq("budget_item_id", parsed.data.budgetItemId);
  if (parsed.data.id) paymentQuery = paymentQuery.neq("id", parsed.data.id);
  const { data: existing } = await paymentQuery;
  const scheduled = (existing ?? []).reduce((sum, payment) => sum + Number(payment.amount_minor), 0);
  if (parsed.data.amountShekels == null) {
    return { status: "error", message: "Enter a payment amount." };
  }
  const amountMinor = parsed.data.amountShekels * 100;
  if (scheduled + amountMinor > Number(item.committed_amount_minor)) {
    return { status: "error", message: "Scheduled payments cannot exceed the committed amount." };
  }
  const values = {
    budget_item_id: parsed.data.budgetItemId,
    label: parsed.data.label,
    amount_minor: amountMinor,
    due_date: parsed.data.dueDate,
    is_paid: parsed.data.isPaid,
    paid_at: parsed.data.isPaid ? new Date().toISOString() : null,
    notes: parsed.data.notes,
  };
  const result = parsed.data.id
    ? await supabase.from("payments").update(values).eq("id", parsed.data.id)
    : await supabase.from("payments").insert(values);
  if (result.error) return { status: "error", message: "The payment could not be saved." };
  refreshBudget();
  return { status: "success", message: parsed.data.isPaid ? "Payment saved as paid." : "Payment scheduled." };
}

export async function togglePaymentPaid(formData: FormData) {
  const parsed = entityIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  const supabase = await createClient();
  const isPaid = formData.get("paid") === "true";
  await supabase.from("payments").update({ is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null }).eq("id", parsed.data.id);
  refreshBudget();
}

export async function deletePayment(formData: FormData) {
  const parsed = entityIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", parsed.data.id);
  refreshBudget();
}
