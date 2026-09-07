"use server";

import { writeMarketplaceRelationship, createExternalRelationship } from "@/lib/vendors/relationship-write";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { safeInternalPath } from "@/lib/auth/redirect";
import { formObject, type ActionState } from "./state";
import { reviewIdSchema, reviewSchema, vendorStatusSchema } from "@/lib/validation/vendor";
import {
  externalVendorIdSchema,
  externalVendorSchema,
  relationshipSavedSchema,
  savedVendorSchema,
} from "@/lib/validation/external-vendor";
import {
  shouldDeleteAfterUnsave,
  storedStatusFromLifecycle,
  type StoredVendorStatus,
} from "@/lib/domain/couple-vendors";

function refreshVendorViews() {
  revalidatePath("/vendors");
  revalidatePath("/vendors/my");
  revalidatePath("/wedding");
  revalidatePath("/wedding/setup");
  revalidatePath("/wedding/details");
  revalidatePath("/budget");
  revalidatePath("/assistant");
}

function redirectToReturn(formData: FormData, outcome = "updated") {
  const returnTo = safeInternalPath(formData.get("returnTo"), "/vendors/my");
  if (returnTo) {
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}relationship=${outcome}`);
  }
}

export async function setVendorStatus(formData: FormData) {
  const parsed = vendorStatusSchema.safeParse(formObject(formData));
  if (!parsed.success) redirectToReturn(formData, "error");
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const isDetailsForm = formData.get("detailsMode") === "true";
  const { data: relationship, error } = await writeMarketplaceRelationship(supabase, wedding.id, parsed.data.vendorId, parsed.data.status,
    isDetailsForm ? { agreed_price_minor: parsed.data.agreedPriceShekels == null ? null : parsed.data.agreedPriceShekels * 100, private_notes: parsed.data.privateNotes } : {});
  if (error || !relationship) redirectToReturn(formData, "error");

  refreshVendorViews();
  redirectToReturn(formData);
}

export async function setMarketplaceVendorSaved(formData: FormData) {
  const parsed = savedVendorSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data: relationship, error: relationshipReadError } = await supabase.from("couple_vendors")
    .select("id, status, agreed_price_minor, private_notes, contact_override, payment_reference, external_vendor_id")
    .eq("wedding_id", wedding.id)
    .eq("vendor_id", parsed.data.vendorId)
    .maybeSingle();

  if (relationshipReadError) redirectToReturn(formData, "error");
  if (!relationship) {
    if (!parsed.data.isSaved) return;
    const { error } = await supabase.from("couple_vendors").insert({
      wedding_id: wedding.id,
      vendor_id: parsed.data.vendorId,
      status: "saved",
      is_saved: true,
    });
    if (error) return;
  } else if (parsed.data.isSaved) {
    const { error } = await supabase.from("couple_vendors")
      .update({ is_saved: true })
      .eq("id", relationship.id)
      .eq("wedding_id", wedding.id);
    if (error) return;
  } else {
    const { count: budgetItemCount, error: budgetReadError } = await supabase.from("budget_items")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", wedding.id)
      .eq("couple_vendor_id", relationship.id);
    if (budgetReadError || budgetItemCount == null) redirectToReturn(formData, "error");
    const shouldDelete = shouldDeleteAfterUnsave({
      status: relationship.status as StoredVendorStatus,
      agreedPriceMinor: relationship.agreed_price_minor == null ? null : Number(relationship.agreed_price_minor),
      privateNotes: relationship.private_notes,
      contactOverride: relationship.contact_override,
      paymentReference: relationship.payment_reference,
      externalVendorId: relationship.external_vendor_id,
      hasBudgetItem: Boolean(budgetItemCount),
    });
    const mutation = shouldDelete
      ? supabase.from("couple_vendors").delete().eq("id", relationship.id).eq("wedding_id", wedding.id)
      : supabase.from("couple_vendors").update({ is_saved: false }).eq("id", relationship.id).eq("wedding_id", wedding.id);
    const { error } = await mutation;
    if (error) return;
  }
  refreshVendorViews();
  redirectToReturn(formData);
}

export async function setRelationshipSaved(formData: FormData) {
  const parsed = relationshipSavedSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data: relationship, error: relationshipReadError } = await supabase.from("couple_vendors")
    .select("id, status, agreed_price_minor, private_notes, contact_override, payment_reference, external_vendor_id")
    .eq("id", parsed.data.relationshipId)
    .eq("wedding_id", wedding.id)
    .maybeSingle();
  if (relationshipReadError || !relationship) redirectToReturn(formData, "error");
  if (!relationship) return;

  if (parsed.data.isSaved) {
    const { error } = await supabase.from("couple_vendors").update({ is_saved: true }).eq("id", relationship.id).eq("wedding_id", wedding.id);
    if (error) return;
  } else {
    const { count: budgetItemCount, error: budgetReadError } = await supabase.from("budget_items")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", wedding.id)
      .eq("couple_vendor_id", relationship.id);
    if (budgetReadError || budgetItemCount == null) redirectToReturn(formData, "error");
    const shouldDelete = shouldDeleteAfterUnsave({
      status: relationship.status as StoredVendorStatus,
      agreedPriceMinor: relationship.agreed_price_minor == null ? null : Number(relationship.agreed_price_minor),
      privateNotes: relationship.private_notes,
      contactOverride: relationship.contact_override,
      paymentReference: relationship.payment_reference,
      externalVendorId: relationship.external_vendor_id,
      hasBudgetItem: Boolean(budgetItemCount),
    });
    const mutation = shouldDelete
      ? supabase.from("couple_vendors").delete().eq("id", relationship.id).eq("wedding_id", wedding.id)
      : supabase.from("couple_vendors").update({ is_saved: false }).eq("id", relationship.id).eq("wedding_id", wedding.id);
    const { error } = await mutation;
    if (error) return;
  }
  refreshVendorViews();
  redirectToReturn(formData);
}

export async function saveExternalVendor(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = externalVendorSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const externalValues = {
    wedding_id: wedding.id,
    business_name: parsed.data.businessName,
    category_id: parsed.data.categoryId,
    subcategory_id: parsed.data.subcategoryId,
    contact_name: parsed.data.contactName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    website_url: parsed.data.websiteUrl,
    notes: parsed.data.notes,
  };
  const relationshipValues = {
    status: storedStatusFromLifecycle(parsed.data.lifecycleStatus === "none" ? null : parsed.data.lifecycleStatus),
    is_saved: parsed.data.isSaved,
    agreed_price_minor: parsed.data.agreedPriceShekels == null ? null : parsed.data.agreedPriceShekels * 100,
  };

  if (parsed.data.externalVendorId && parsed.data.relationshipId) {
    const { data: ownedRelationship } = await supabase.from("couple_vendors")
      .select("id")
      .eq("id", parsed.data.relationshipId)
      .eq("external_vendor_id", parsed.data.externalVendorId)
      .eq("wedding_id", wedding.id)
      .maybeSingle();
    if (!ownedRelationship) return { status: "error", message: "This external vendor could not be found." };
    const { error: externalError } = await supabase.from("external_vendors")
      .update(externalValues)
      .eq("id", parsed.data.externalVendorId)
      .eq("wedding_id", wedding.id);
    if (externalError) return { status: "error", message: "The external vendor details could not be saved." };
    const { data: savedRelationship, error: relationshipError } = await supabase.from("couple_vendors")
      .update(relationshipValues)
      .eq("id", parsed.data.relationshipId)
      .eq("wedding_id", wedding.id).select("id").single();
    if (relationshipError || !savedRelationship) return { status: "error", message: "The booking and budget could not be saved. Please try again." };
    refreshVendorViews();
    return { status: "success", message: "External vendor updated." };
  }

  const created = await createExternalRelationship(supabase, wedding.id, externalValues, relationshipValues);
  if (!created.ok) return { status: "error", message: "The external vendor could not be confirmed. Refresh Our Vendors before trying again." };
  refreshVendorViews();
  return { status: "success", message: "External vendor added to Our Vendors." };
}

export async function deleteExternalVendor(formData: FormData) {
  const parsed = externalVendorIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data, error } = await supabase.from("external_vendors")
    .delete()
    .eq("id", parsed.data.externalVendorId)
    .eq("wedding_id", wedding.id).select("id").single();
  if (error || !data) redirect("/vendors/my?relationship=financial-history");
  refreshVendorViews();
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
