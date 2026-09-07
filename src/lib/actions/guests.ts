"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { guestIdSchema, guestSchema } from "@/lib/validation/guest";
import { formObject, type ActionState } from "./state";

function refreshGuestViews() {
  revalidatePath("/guests");
  revalidatePath("/wedding");
  revalidatePath("/assistant");
}

export async function saveGuest(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = guestSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };

  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const values = {
    wedding_id: wedding.id,
    full_name: parsed.data.fullName,
    party_name: parsed.data.partyName,
    guest_group: parsed.data.guestGroup,
    side: parsed.data.side,
    phone: parsed.data.phone,
    email: parsed.data.email,
    rsvp_status: parsed.data.rsvpStatus,
    invited_count: parsed.data.invitedCount,
    attending_count: parsed.data.attendingCount,
    dietary_notes: parsed.data.dietaryNotes,
    private_notes: parsed.data.privateNotes,
  };

  const result = parsed.data.id
    ? await supabase.from("guests").update(values).eq("id", parsed.data.id).eq("wedding_id", wedding.id).select("id").maybeSingle()
    : await supabase.from("guests").insert(values).select("id").single();
  if (result.error || !result.data) return { status: "error", message: "The guest could not be saved. Please try again." };

  refreshGuestViews();
  redirect(`/guests?guest=${parsed.data.id ? "updated" : "added"}`);
}

export async function deleteGuest(formData: FormData) {
  const parsed = guestIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data, error } = await supabase.from("guests").delete().eq("id", parsed.data.id).eq("wedding_id", wedding.id).select("id").maybeSingle();
  if (error || !data) throw new Error("The guest could not be deleted. Please try again.");
  refreshGuestViews();
}
