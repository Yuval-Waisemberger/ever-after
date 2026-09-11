import type { createClient } from "@/lib/supabase/server";

type DatabaseClient = Awaited<ReturnType<typeof createClient>>;

export const PUBLIC_VENDOR_COLUMNS = "id, slug, business_name, description, category_slug, category_name, subcategory_slug, subcategory_name, location_city, location_mode, physical_area, service_areas, min_price_minor, max_price_minor, services, styles, event_types, min_guest_capacity, max_guest_capacity, friday_available, phone, email, website_url, instagram_url";
export const PUBLIC_VENDOR_IMAGE_COLUMNS = "id, vendor_id, storage_path, external_url, alt_text, sort_order, is_primary";
export const PUBLIC_VENDOR_REVIEW_COLUMNS = "id, vendor_id, reviewer_display_name, professionalism, punctuality, service_attitude, value_for_money, would_choose_again, review_text, created_at";

export type PublicVendorRow = {
  id: string;
  slug: string;
  business_name: string;
  description: string | null;
  category_slug: string | null;
  category_name: string | null;
  subcategory_slug: string | null;
  subcategory_name: string | null;
  location_city: string | null;
  location_mode: "fixed" | "mobile";
  physical_area: string | null;
  service_areas: string[];
  min_price_minor: number | string | null;
  max_price_minor: number | string | null;
  services: string[];
  styles: string[];
  event_types: string[];
  min_guest_capacity: number | null;
  max_guest_capacity: number | null;
  friday_available: boolean | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  instagram_url: string | null;
};

export type PublicVendorImageRow = {
  id: string;
  vendor_id: string;
  storage_path: string | null;
  external_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type PublicVendorReviewRow = {
  id: string;
  vendor_id: string;
  reviewer_display_name: string;
  professionalism: number;
  punctuality: number;
  service_attitude: number;
  value_for_money: number;
  would_choose_again: boolean;
  review_text: string | null;
  created_at: string;
};

export type PublicVendorLegacyRelation = PublicVendorRow & {
  vendor_categories: { slug: string | null; name: string | null } | null;
  vendor_subcategories: { slug: string | null; name: string | null } | null;
  vendor_images: PublicVendorImageRow[];
  reviews: PublicVendorReviewRow[];
};

const MAX_BATCH_VENDOR_IDS = 1_000;

function boundedVendorIds(vendorIds: readonly string[]) {
  const ids = [...new Set(vendorIds)];
  if (ids.length > MAX_BATCH_VENDOR_IDS) throw new Error("Too many Vendor records were requested.");
  return ids;
}

export async function readPublicVendorsByIds(db: DatabaseClient, vendorIds: readonly string[]) {
  const ids = boundedVendorIds(vendorIds);
  if (!ids.length) return [] as PublicVendorRow[];
  const { data, error } = await db.from("public_vendor_profiles")
    .select(PUBLIC_VENDOR_COLUMNS).in("id", ids).order("id").limit(ids.length);
  if (error || !data) throw new Error("Public Vendor details could not be loaded.");
  return data as PublicVendorRow[];
}

export async function readPublicVendorAssets(
  db: DatabaseClient,
  vendorIds: readonly string[],
  options: { images?: boolean; reviews?: boolean } = { images: true, reviews: true },
) {
  const ids = boundedVendorIds(vendorIds);
  const empty = {
    imagesByVendorId: new Map<string, PublicVendorImageRow[]>(),
    reviewsByVendorId: new Map<string, PublicVendorReviewRow[]>(),
  };
  if (!ids.length) return empty;

  const [imageResult, reviewResult] = await Promise.all([
    options.images === false ? Promise.resolve({ data: [] as PublicVendorImageRow[], error: null }) : db
      .from("public_vendor_images").select(PUBLIC_VENDOR_IMAGE_COLUMNS).in("vendor_id", ids).order("vendor_id").order("sort_order").limit(ids.length * 20),
    options.reviews === false ? Promise.resolve({ data: [] as PublicVendorReviewRow[], error: null }) : db
      .from("public_vendor_reviews").select(PUBLIC_VENDOR_REVIEW_COLUMNS).in("vendor_id", ids).order("vendor_id").order("created_at", { ascending: false }).limit(ids.length * 1_000),
  ]);
  if (imageResult.error || !imageResult.data) throw new Error("Public Vendor images could not be loaded.");
  if (reviewResult.error || !reviewResult.data) throw new Error("Public Vendor reviews could not be loaded.");

  const imagesByVendorId = new Map<string, PublicVendorImageRow[]>();
  for (const image of imageResult.data as PublicVendorImageRow[]) {
    imagesByVendorId.set(image.vendor_id, [...(imagesByVendorId.get(image.vendor_id) ?? []), image]);
  }
  const reviewsByVendorId = new Map<string, PublicVendorReviewRow[]>();
  for (const review of reviewResult.data as PublicVendorReviewRow[]) {
    reviewsByVendorId.set(review.vendor_id, [...(reviewsByVendorId.get(review.vendor_id) ?? []), review]);
  }
  return { imagesByVendorId, reviewsByVendorId };
}

export function publicVendorAsLegacyRelation(
  vendor: PublicVendorRow,
  images: PublicVendorImageRow[] = [],
  reviews: PublicVendorReviewRow[] = [],
): PublicVendorLegacyRelation {
  return {
    ...vendor,
    vendor_categories: vendor.category_slug || vendor.category_name
      ? { slug: vendor.category_slug, name: vendor.category_name }
      : null,
    vendor_subcategories: vendor.subcategory_slug || vendor.subcategory_name
      ? { slug: vendor.subcategory_slug, name: vendor.subcategory_name }
      : null,
    vendor_images: images,
    reviews,
  };
}
