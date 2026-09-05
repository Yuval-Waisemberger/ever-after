"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { safeInternalPath } from "@/lib/auth/redirect";
import { formObject, type ActionState } from "./state";
import { reviewIdSchema, reviewSchema, vendorStatusSchema } from "@/lib/validation/vendor";

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
  const { data: relationship, error } = await supabase.from("couple_vendors").upsert(
    values,
    { onConflict: "wedding_id,vendor_id" },
  ).select("id").single();
  if (error || !relationship) return;

  if (isDetailsForm && parsed.data.status === "booked" && parsed.data.agreedPriceShekels != null) {
    const committedAmountMinor = parsed.data.agreedPriceShekels * 100;
    const [{ data: existingItem }, { data: vendor }] = await Promise.all([
      supabase.from("budget_items").select("id").eq("wedding_id", wedding.id).eq("couple_vendor_id", relationship.id).order("created_at").limit(1).maybeSingle(),
      supabase.from("vendor_profiles").select("business_name, vendor_subcategories(name), vendor_categories(name)").eq("id", parsed.data.vendorId).single(),
    ]);
    const subcategory = Array.isArray(vendor?.vendor_subcategories) ? vendor.vendor_subcategories[0] : vendor?.vendor_subcategories;
    const category = Array.isArray(vendor?.vendor_categories) ? vendor.vendor_categories[0] : vendor?.vendor_categories;
    const budgetValues = {
      wedding_id: wedding.id,
      couple_vendor_id: relationship.id,
      label: vendor?.business_name ?? "Booked vendor",
      category: subcategory?.name ?? category?.name ?? "Vendor",
      committed_amount_minor: committedAmountMinor,
    };
    if (existingItem) await supabase.from("budget_items").update(budgetValues).eq("id", existingItem.id).eq("wedding_id", wedding.id);
    else await supabase.from("budget_items").insert(budgetValues);
  }
  revalidatePath("/vendors");
  revalidatePath("/vendors/my");
  revalidatePath("/wedding");
  revalidatePath("/budget");
  revalidatePath("/assistant");
  const returnTo = safeInternalPath(formData.get("returnTo"), "");
  if (returnTo) {
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}relationship=updated`);
  }
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

export async function deleteReview(formData: FormData) {
  const parsed = reviewIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  await supabase.from("reviews").delete().eq("id", parsed.data.id).eq("wedding_id", wedding.id).eq("is_seeded", false);
  revalidatePath("/reviews");
  revalidatePath("/vendors");
  revalidatePath("/vendor");
}
