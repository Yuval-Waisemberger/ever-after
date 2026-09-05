"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { weddingDetailsSchema, weddingSetupSchema } from "@/lib/validation/wedding";
import { isWeddingSetupComplete } from "@/lib/domain/wedding-setup";
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
    venue_status: data.venueStatus,
    venue_name: data.venueStatus === "booked" ? data.venueName : null,
    guest_count: data.guestCount,
    preferred_area: data.preferredArea,
    event_type: data.eventType,
    styles: data.styles,
    priorities: data.priorities,
    booked_categories: data.bookedCategories,
    total_budget_minor:
      data.totalBudgetShekels == null ? null : data.totalBudgetShekels * 100,
  };
}

export async function completeWeddingSetup(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = weddingSetupSchema.safeParse(rawWeddingValues(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data: saved, error } = await supabase
    .from("weddings")
    .update({ ...weddingUpdate(parsed.data), setup_status: "completed" })
    .eq("id", wedding.id)
    .select("id")
    .single();
  if (error || !saved) return { status: "error", message: "Wedding Setup could not be saved." };
  revalidatePath("/wedding");
  revalidatePath("/wedding/details");
  redirect("/wedding?setup=complete");
}

export async function skipWeddingSetup() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  await supabase.from("weddings").update({ setup_status: "skipped" }).eq("id", wedding.id);
  revalidatePath("/wedding");
  redirect("/wedding");
}

export async function saveWeddingDetails(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = weddingDetailsSchema.safeParse({
    ...rawWeddingValues(formData),
    partnerOneName: formData.get("partnerOneName"),
    partnerTwoName: formData.get("partnerTwoName"),
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const setupComplete = isWeddingSetupComplete(parsed.data);
  const setupStatus = setupComplete
    ? "completed"
    : wedding.setup_status === "completed"
      ? "skipped"
      : wedding.setup_status;
  const { data: saved, error } = await supabase
    .from("weddings")
    .update({
      ...weddingUpdate(parsed.data),
      partner_one_name: parsed.data.partnerOneName,
      partner_two_name: parsed.data.partnerTwoName,
      setup_status: setupStatus,
    })
    .eq("id", wedding.id)
    .select("id")
    .single();
  if (error || !saved) return { status: "error", message: "Wedding Details could not be saved." };
  revalidatePath("/wedding");
  revalidatePath("/wedding/details");
  revalidatePath("/wedding/timeline");
  revalidatePath("/vendors");
  revalidatePath("/assistant");
  redirect("/wedding?details=updated");
}
