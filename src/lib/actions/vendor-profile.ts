"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVendorProfile } from "@/lib/queries/vendor-dashboard";
import { vendorProfileSchema } from "@/lib/validation/vendor-profile";
import type { ActionState } from "./state";

const nullable = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export async function saveVendorProfile(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const categoryChoice = nullable(formData.get("categoryChoice"));
  const [categoryId, subcategoryId] = categoryChoice?.split(":") ?? [null, null];
  const parsed = vendorProfileSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: nullable(formData.get("contactName")),
    description: nullable(formData.get("description")),
    locationCity: nullable(formData.get("locationCity")),
    categoryId,
    subcategoryId,
    serviceAreas: formData.getAll("serviceAreas"),
    minPriceShekels: formData.get("minPriceShekels"),
    maxPriceShekels: formData.get("maxPriceShekels"),
    services: String(formData.get("services") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    styles: formData.getAll("styles"),
    eventTypes: formData.getAll("eventTypes"),
    minGuestCapacity: formData.get("minGuestCapacity"),
    maxGuestCapacity: formData.get("maxGuestCapacity"),
    fridayAvailable: formData.get("fridayAvailable") === "on",
    indoorAvailable: formData.get("indoorAvailable") === "on",
    outdoorAvailable: formData.get("outdoorAvailable") === "on",
    phone: nullable(formData.get("phone")),
    email: nullable(formData.get("email")),
    websiteUrl: formData.get("websiteUrl"),
    instagramUrl: formData.get("instagramUrl"),
    isPublic: formData.get("isPublic") === "on",
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const profile = await getOwnedVendorProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_profiles").update({
    business_name: parsed.data.businessName,
    contact_name: parsed.data.contactName,
    description: parsed.data.description,
    location_city: parsed.data.locationCity,
    category_id: parsed.data.categoryId,
    subcategory_id: parsed.data.subcategoryId,
    service_areas: parsed.data.serviceAreas,
    min_price_minor: parsed.data.minPriceShekels == null ? null : parsed.data.minPriceShekels * 100,
    max_price_minor: parsed.data.maxPriceShekels == null ? null : parsed.data.maxPriceShekels * 100,
    services: parsed.data.services,
    styles: parsed.data.styles,
    event_types: parsed.data.eventTypes,
    min_guest_capacity: parsed.data.minGuestCapacity,
    max_guest_capacity: parsed.data.maxGuestCapacity,
    friday_available: parsed.data.fridayAvailable,
    indoor_available: parsed.data.indoorAvailable,
    outdoor_available: parsed.data.outdoorAvailable,
    phone: parsed.data.phone,
    email: parsed.data.email,
    website_url: parsed.data.websiteUrl,
    instagram_url: parsed.data.instagramUrl,
    is_public: parsed.data.isPublic,
  }).eq("id", profile.id);
  if (error) return { status: "error", message: "The business profile could not be saved." };
  revalidatePath("/vendor");
  revalidatePath("/vendor/profile");
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${profile.slug}`);
  return { status: "success", message: "Business profile updated." };
}

export async function registerVendorImage(vendorId: string, storagePath: string, altText: string) {
  const profile = await getOwnedVendorProfile();
  if (profile.id !== vendorId || !storagePath.startsWith(`${vendorId}/`)) throw new Error("Invalid image path.");
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_images").insert({ vendor_id: vendorId, storage_path: storagePath, alt_text: altText.trim().slice(0, 240), sort_order: profile.vendor_images?.length ?? 0, is_primary: (profile.vendor_images?.length ?? 0) === 0 });
  if (error) throw new Error("Image metadata could not be saved.");
  revalidatePath("/vendor");
  revalidatePath("/vendor/profile");
}

export async function deleteVendorImage(formData: FormData) {
  const profile = await getOwnedVendorProfile();
  const imageId = String(formData.get("imageId") ?? "");
  const image = profile.vendor_images?.find((candidate) => candidate.id === imageId);
  if (!image) return;
  const supabase = await createClient();
  if (image.storage_path) await supabase.storage.from("vendor-media").remove([image.storage_path]);
  await supabase.from("vendor_images").delete().eq("id", imageId).eq("vendor_id", profile.id);
  revalidatePath("/vendor");
  revalidatePath("/vendor/profile");
}
