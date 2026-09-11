import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/user";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateTaskSummary, type TaskStatus } from "@/lib/domain/tasks";
import { publicVendorAsLegacyRelation, readPublicVendorAssets, readPublicVendorsByIds, type PublicVendorLegacyRelation } from "./public-vendor-data";

export const getOwnedWedding = cache(async () => {
  const profile = await requireRole("couple");
  const supabase = await createClient();
  const { data, error } = await supabase.from("weddings").select("*").eq("owner_user_id", profile.id).single();
  if (error || !data) throw new Error("Wedding details could not be loaded.");
  return data;
});

export async function getWeddingDashboard() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();

  const [{ data: tasks, error: taskError }, { data: relationships, error: vendorError }, { data: budgetItems, error: budgetError }] =
    await Promise.all([
      supabase.from("tasks").select("id, title, category, due_date, status, priority").eq("wedding_id", wedding.id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("couple_vendors").select("id, vendor_id, status, is_saved, agreed_price_minor, external_vendors(business_name, vendor_subcategories(name))").eq("wedding_id", wedding.id),
      supabase.from("budget_items").select("id, label, source, couple_vendors(status), estimated_amount_minor, committed_amount_minor, payments(label, amount_minor, is_paid, due_date)").eq("wedding_id", wedding.id),
    ]);

  if (taskError || vendorError || budgetError || !budgetItems || budgetItems.some(item => !item.payments)) throw new Error("Dashboard summary could not be loaded.");
  const relationshipRows = relationships ?? [];
  const vendorIds = relationshipRows.flatMap((row) => row.vendor_id ? [row.vendor_id] : []);
  const [publicVendors, vendorAssets] = await Promise.all([
    readPublicVendorsByIds(supabase, vendorIds),
    readPublicVendorAssets(supabase, vendorIds, { images: true, reviews: false }),
  ]);
  const publicVendorById = new Map(publicVendors.map((vendor) => [vendor.id, vendor]));
  const safeRelationships: Array<{
    id: string;
    vendor_id: string | null;
    status: string;
    is_saved: boolean;
    agreed_price_minor: number | string | null;
    external_vendors: typeof relationshipRows[number]["external_vendors"];
    vendor_profiles: PublicVendorLegacyRelation | PublicVendorLegacyRelation[] | null;
  }> = relationshipRows.map((row) => {
    const vendor = row.vendor_id ? publicVendorById.get(row.vendor_id) : null;
    return {
      id: row.id,
      vendor_id: row.vendor_id,
      status: row.status,
      is_saved: row.is_saved,
      agreed_price_minor: row.agreed_price_minor,
      external_vendors: row.external_vendors,
      vendor_profiles: vendor
        ? publicVendorAsLegacyRelation(vendor, vendorAssets.imagesByVendorId.get(vendor.id) ?? [])
        : null,
    };
  });

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
    relationships: safeRelationships,
    budget,
    budgetItems: normalizedBudgetItems,
  };
}
