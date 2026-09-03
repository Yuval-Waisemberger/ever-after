import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/user";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateTaskCompletionPercentage, isDueWithinDays, type TaskStatus } from "@/lib/domain/tasks";

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
      supabase.from("tasks").select("id, title, due_date, status, priority").eq("wedding_id", wedding.id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("couple_vendors").select("id, status, agreed_price_minor, vendor_profiles(business_name, vendor_subcategories(name))").eq("wedding_id", wedding.id),
      supabase.from("budget_items").select("id, label, estimated_amount_minor, committed_amount_minor, payments(amount_minor, is_paid, due_date)").eq("wedding_id", wedding.id),
    ]);

  if (taskError || vendorError || budgetError) throw new Error("Dashboard summary could not be loaded.");

  const normalizedTasks = (tasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.due_date,
    status: task.status as TaskStatus,
    priority: task.priority,
  }));
  const budget = calculateBudgetSummary(
    wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor),
    (budgetItems ?? []).map((item) => ({
      estimatedAmountMinor: item.estimated_amount_minor == null ? null : Number(item.estimated_amount_minor),
      committedAmountMinor: item.committed_amount_minor == null ? null : Number(item.committed_amount_minor),
      payments: (item.payments ?? []).map((payment) => ({
        amountMinor: Number(payment.amount_minor),
        isPaid: payment.is_paid,
        dueDate: payment.due_date,
      })),
    })),
  );
  const today = new Date();

  return {
    wedding,
    tasks: normalizedTasks,
    taskSummary: {
      open: normalizedTasks.filter((task) => task.status !== "completed").length,
      dueThisWeek: normalizedTasks.filter((task) => task.status !== "completed" && isDueWithinDays(task.dueDate, today, 7)).length,
      completion: calculateTaskCompletionPercentage(normalizedTasks),
    },
    relationships: relationships ?? [],
    budget,
  };
}
