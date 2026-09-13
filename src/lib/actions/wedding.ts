"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { resolveActionAccess } from "@/lib/auth/protected-access";
import { weddingDetailsSchema, weddingSetupSchema } from "@/lib/validation/wedding";
import { weddingSetupStatus } from "@/lib/domain/wedding-setup";
import type { ActionState } from "./state";

function rawWeddingValues(formData: FormData) {
  return {
    weddingDate: formData.get("weddingDate"),
    venueStatus: formData.get("venueStatus"),
    venueName: formData.get("venueName"),
    guestCount: formData.get("guestCount"),
    preferredArea: formData.get("preferredArea"),
    eventType: formData.get("eventType"),
    styles: formData.getAll("styles"),
    priorities: formData.getAll("priorities"),
    bookedCategories: formData.getAll("bookedCategories"),
    totalBudgetShekels: formData.get("totalBudgetShekels"),
  };
}

function weddingUpdate(data: Awaited<ReturnType<typeof weddingSetupSchema.parse>>) {
  return {
    wedding_date: data.weddingDate,

    guest_count: data.guestCount,
    preferred_area: data.preferredArea,
    event_type: data.eventType,
    styles: data.styles,
    priorities: data.priorities,

    total_budget_minor:
      data.totalBudgetShekels == null ? null : data.totalBudgetShekels * 100,
  };
}

export async function completeWeddingSetup(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const wedding = await getOwnedWedding();
  const parsed = weddingSetupSchema.safeParse({ ...rawWeddingValues(formData), venueStatus: wedding.venue_status, venueName: wedding.venue_name, bookedCategories: wedding.booked_categories });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  if (formData.get("revision") !== wedding.updated_at) return { status: "error", message: "Wedding Details changed since this form opened. Reload before saving; your unsaved entries have not been applied." };
  const supabase = await createClient();
  const { data: saved, error } = await supabase
    .from("weddings")
    .update({ ...weddingUpdate(parsed.data), setup_status: weddingSetupStatus(parsed.data) })
    .eq("id", wedding.id)
    .eq("updated_at", String(formData.get("revision")))
    .select("id")
    .single();
  if (error || !saved) return { status: "error", message: "Wedding Setup could not be saved." };
  refreshWeddingViews(true, wedding.total_budget_minor == null ? parsed.data.totalBudgetShekels != null : Number(wedding.total_budget_minor) !== (parsed.data.totalBudgetShekels == null ? null : parsed.data.totalBudgetShekels * 100));
  redirect(weddingSetupStatus(parsed.data) === "completed" ? "/wedding?setup=complete" : "/wedding?setup=partial");
}

export async function skipWeddingSetup(previous: ActionState): Promise<ActionState> {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  void previous;
  try {
    const { data, error } = await supabase.from("weddings").update({ setup_status: "skipped" }).eq("id", wedding.id).select("id").single();
    if (error || !data) return { status: "error", message: "Setup could not be skipped. Please try again." };
  } catch { return { status: "error", message: "Setup could not be skipped. Please try again." }; }
  refreshWeddingViews();
  redirect("/wedding");
}

export async function saveWeddingDetails(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await resolveActionAccess(getOwnedWedding);
  if (!access.ok) return access.state;
  const wedding = access.value;
  const parsed = weddingDetailsSchema.safeParse({
    ...rawWeddingValues(formData),
    venueStatus: wedding.venue_status, venueName: wedding.venue_name, bookedCategories: wedding.booked_categories,
    partnerOneName: formData.get("partnerOneName"),
    partnerTwoName: formData.get("partnerTwoName"),
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (formData.get("revision") !== wedding.updated_at) return { status: "error", message: "Wedding Details changed since this form opened. Reload before saving; your unsaved entries have not been applied." };
  const setupStatus = weddingSetupStatus(parsed.data);
  const { data: saved, error } = await supabase
    .from("weddings")
    .update({
      ...weddingUpdate(parsed.data),
      partner_one_name: parsed.data.partnerOneName,
      partner_two_name: parsed.data.partnerTwoName,
      setup_status: setupStatus,
    })
    .eq("id", wedding.id)
    .eq("updated_at", String(formData.get("revision")))
    .select("id")
    .single();
  if (error || !saved) return { status: "error", message: "Wedding Details could not be saved." };
  refreshWeddingViews(true, wedding.total_budget_minor == null ? parsed.data.totalBudgetShekels != null : Number(wedding.total_budget_minor) !== (parsed.data.totalBudgetShekels == null ? null : parsed.data.totalBudgetShekels * 100));

  redirect("/wedding?details=updated");
}

function refreshWeddingViews(preferences = false, budget = false) {
  const paths = ["/wedding", "/wedding/setup", "/wedding/details", "/tasks"];
  if (preferences) paths.push("/wedding/timeline", "/vendors", "/assistant");
  if (budget) paths.push("/budget");
  for (const path of paths) revalidatePath(path);
}
