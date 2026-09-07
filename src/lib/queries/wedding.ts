import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/user";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateTaskSummary, type TaskStatus } from "@/lib/domain/tasks";

export const getOwnedWedding = cache(async () => {
  await requireRole("couple");
  const supabase = await createClient();
  const { data, error } = await supabase.from("weddings").select("*").single();
  if (error || !data) throw new Error("Wedding details could not be loaded.");
  return data;
});

export async function getWeddingDashboard() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();

  const [{ data: tasks, error: taskError }, { data: relationships, error: vendorError }, { data: budgetItems, error: budgetError }] =
    await Promise.all([
      supabase.from("tasks").select("id, title, category, due_date, status, priority").eq("wedding_id", wedding.id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("couple_vendors").select("id, status, is_saved, agreed_price_minor, vendor_profiles(slug, business_name, vendor_subcategories(name), vendor_images(external_url, storage_path, alt_text, is_primary, sort_order)), external_vendors(business_name, vendor_subcategories(name))").eq("wedding_id", wedding.id),
      supabase.from("budget_items").select("id, label, source, couple_vendors(status), estimated_amount_minor, committed_amount_minor, payments(label, amount_minor, is_paid, due_date)").eq("wedding_id", wedding.id),
    ]);

  if (taskError || vendorError || budgetError || !budgetItems || budgetItems.some(item => !item.payments)) throw new Error("Dashboard summary could not be loaded.");

  const normalizedTasks = (tasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    category: task.category,
    dueDate: task.due_date,
    status: task.status as TaskStatus,
    priority: task.priority,
  }));
  const normalizedBudgetItems = (budgetItems ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    source: item.source as "manual" | "booked_vendor",
    relationshipStatus: (Array.isArray(item.couple_vendors) ? item.couple_vendors[0] : item.couple_vendors)?.status ?? null,
    estimatedAmountMinor: item.estimated_amount_minor == null ? null : Number(item.estimated_amount_minor),
    committedAmountMinor: item.committed_amount_minor == null ? null : Number(item.committed_amount_minor),
    payments: (item.payments ?? []).map((payment) => ({
      label: payment.label,
      itemLabel: item.label,
      amountMinor: Number(payment.amount_minor),
      isPaid: payment.is_paid,
      dueDate: payment.due_date,
    })),
  }));
  const budget = calculateBudgetSummary(
    wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor),
    normalizedBudgetItems,
  );
  const today = new Date();

  return {
    wedding,
    tasks: normalizedTasks,
    taskSummary: calculateTaskSummary(normalizedTasks, today),
    relationships: relationships ?? [],
    budget,
    budgetItems: normalizedBudgetItems,
  };
}
