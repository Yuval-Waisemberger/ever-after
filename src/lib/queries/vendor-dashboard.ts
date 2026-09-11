import { createClient } from "@/lib/supabase/server";
import { calculateVendorProfileCompletion } from "@/lib/domain/vendor-profile";
import { requireRole } from "@/lib/auth/user";
import type { VendorArea, VendorLocationMode } from "@/lib/vendors/location";
import { PUBLIC_VENDOR_REVIEW_COLUMNS } from "./public-vendor-data";

export type VendorReviewRecord = {
  id: string;
  reviewer_display_name: string;
  professionalism: number;
  punctuality: number;
  service_attitude: number;
  value_for_money: number;
  would_choose_again: boolean;
  review_text: string | null;
  created_at: string;
};

export type VendorImageRecord = {
  id: string;
  storage_path: string | null;
  external_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type OwnedVendorProfile = {
  id: string;
  slug: string;
  business_name: string;
  profile_image_storage_path: string | null;
  contact_name: string | null;
  description: string | null;
  location_city: string | null;
  location_mode: VendorLocationMode;
  physical_area: VendorArea | null;
  category_id: string | null;
  subcategory_id: string | null;
  service_areas: string[];
  min_price_minor: number | string | null;
  max_price_minor: number | string | null;
  services: string[];
  styles: string[];
  event_types: string[];
  min_guest_capacity: number | null;
  max_guest_capacity: number | null;
  friday_available: boolean | null;
  indoor_available: boolean | null;
  outdoor_available: boolean | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  instagram_url: string | null;
  is_public: boolean;
  vendor_images: VendorImageRecord[] | null;
  reviews: VendorReviewRecord[] | null;
};

export type VendorTaxonomy = Array<{
  id: string;
  name: string;
  slug: string;
  vendor_subcategories: Array<{ id: string; name: string; slug: string }>;
}>;

export async function getOwnedVendorProfile(): Promise<OwnedVendorProfile | null> {
  const account = await requireRole("vendor");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_profiles")
    .select("*, vendor_categories(name), vendor_subcategories(name), vendor_images(id, storage_path, external_url, alt_text, sort_order, is_primary)")
    .eq("owner_user_id", account.id)
    .maybeSingle();
  if (error) throw new Error("Vendor profile could not be loaded.");
  if (!data) return null;
  const { data: reviews, error: reviewError } = await supabase.from("vendor_owner_reviews")
    .select(PUBLIC_VENDOR_REVIEW_COLUMNS).eq("vendor_id", data.id).order("created_at", { ascending: false });
  if (reviewError || !reviews) throw new Error("Vendor reviews could not be loaded.");
  return { ...data, reviews } as OwnedVendorProfile;
}

export async function getVendorDashboard() {
  const profile = await getOwnedVendorProfile();
  if (!profile) return null;
  const reviews = profile.reviews ?? [];
  const rating = reviews.length
    ? reviews.reduce((sum: number, review) => sum + (review.professionalism + review.punctuality + review.service_attitude + review.value_for_money) / 4, 0) / reviews.length
    : null;
  const completion = calculateVendorProfileCompletion({
    businessName: profile.business_name,
    description: profile.description,
    categoryId: profile.category_id,
    subcategoryId: profile.subcategory_id,
    locationCity: profile.location_city,
    locationMode: profile.location_mode,
    physicalArea: profile.physical_area,
    serviceAreas: profile.service_areas,
    minPriceMinor: profile.min_price_minor == null ? null : Number(profile.min_price_minor),
    maxPriceMinor: profile.max_price_minor == null ? null : Number(profile.max_price_minor),
    services: profile.services,
    phone: profile.phone,
    email: profile.email,
    imageCount: profile.vendor_images?.length ?? 0,
  });
  return { profile, reviews, rating, completion };
}

export async function getVendorTaxonomy(): Promise<VendorTaxonomy> {
  await requireRole("vendor");
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendor_categories").select("id, name, slug, vendor_subcategories(id, name, slug)").order("sort_order");
  if (error) throw new Error("Vendor categories could not be loaded.");
  return (data ?? []) as VendorTaxonomy;
}

export async function getVendorIdentity(fallbackName: string) {
  const profile = await getOwnedVendorProfile();
  return {
    displayName: profile?.business_name?.trim() || fallbackName,
    photoUrl: profile?.profile_image_storage_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-media/${profile.profile_image_storage_path}`
      : null,
  };
}
