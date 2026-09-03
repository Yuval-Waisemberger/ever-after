"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { formObject, type ActionState } from "./state";
import { reviewSchema, vendorStatusSchema } from "@/lib/validation/vendor";

export async function setVendorStatus(formData: FormData) {
  const parsed = vendorStatusSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const isDetailsForm = formData.get("detailsMode") === "true";
  const values = {
    wedding_id: wedding.id,
    vendor_id: parsed.data.vendorId,
    status: parsed.data.status,
    ...(isDetailsForm
      ? {
          agreed_price_minor:
            parsed.data.agreedPriceShekels == null
              ? null
              : parsed.data.agreedPriceShekels * 100,
          private_notes: parsed.data.privateNotes,
        }
      : {}),
  };
  await supabase.from("couple_vendors").upsert(
    values,
    { onConflict: "wedding_id,vendor_id" },
  );
  revalidatePath("/vendors");
  revalidatePath("/vendors/my");
  revalidatePath("/wedding");
}

export async function submitReview(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reviewSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").upsert(
    {
      wedding_id: wedding.id,
      vendor_id: parsed.data.vendorId,
      reviewer_display_name: parsed.data.reviewerDisplayName,
      professionalism: parsed.data.professionalism,
      punctuality: parsed.data.punctuality,
      service_attitude: parsed.data.serviceAttitude,
      value_for_money: parsed.data.valueForMoney,
      would_choose_again: parsed.data.wouldChooseAgain,
      review_text: parsed.data.reviewText,
      is_public: true,
      is_seeded: false,
    },
    { onConflict: "wedding_id,vendor_id" },
  );
  if (error) return { status: "error", message: "Your review could not be saved." };
  const vendorSlug = String(formData.get("vendorSlug") ?? "").replace(/[^a-z0-9-]/g, "");
  if (vendorSlug) revalidatePath(`/vendors/${vendorSlug}`);
  revalidatePath("/vendor");
  return { status: "success", message: "Your review is now part of this vendor profile." };
}
