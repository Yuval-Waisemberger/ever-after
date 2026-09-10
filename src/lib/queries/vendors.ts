import { cache } from "react";
import { requireRole, getCurrentProfile } from "@/lib/auth/user";
import { calculateRecommendation } from "@/lib/domain/recommendation";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { demoVendors } from "@/lib/vendors/demo";
import type { MarketplaceSubcategory, MarketplaceVendor, VendorFilters, VendorReview } from "@/lib/vendors/types";
import { lifecycleFromStoredStatus } from "@/lib/domain/couple-vendors";
import { vendorMatchesArea, type VendorArea } from "@/lib/vendors/location";

const PAGE_SIZE = 12;

function relationship<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function imageUrl(image: { storage_path?: string | null; external_url?: string | null } | null, supabaseUrl: string): string | null {
  if (!image) return null;
  if (image.external_url) return image.external_url;
  if (!image.storage_path) return null;
  return `${supabaseUrl}/storage/v1/object/public/vendor-media/${image.storage_path}`;
}

function normalizeReview(review: Record<string, unknown>): VendorReview {
  return {
    id: String(review.id),
    reviewerDisplayName: String(review.reviewer_display_name),
    professionalism: Number(review.professionalism),
    punctuality: Number(review.punctuality),
    serviceAttitude: Number(review.service_attitude),
    valueForMoney: Number(review.value_for_money),
    wouldChooseAgain: Boolean(review.would_choose_again),
    reviewText: review.review_text == null ? null : String(review.review_text),
    createdAt: String(review.created_at),
  };
}

type VendorImageRow = {
  id: string;
  storage_path: string | null;
  external_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

type VendorRelation = { slug?: string; name?: string };

type VendorRow = Record<string, unknown> & {
  vendor_categories: VendorRelation | VendorRelation[] | null;
  vendor_subcategories: VendorRelation | VendorRelation[] | null;
  vendor_images: VendorImageRow[] | null;
  reviews: Record<string, unknown>[] | null;
};

function mapVendor(row: VendorRow, supabaseUrl: string): MarketplaceVendor {
  const category = relationship(row.vendor_categories);
  const subcategory = relationship(row.vendor_subcategories);
  const images = (row.vendor_images ?? []).toSorted(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  const reviews = (row.reviews ?? []).map(normalizeReview);
  const ratingAverage = reviews.length
    ? reviews.reduce(
        (sum: number, review: VendorReview) =>
          sum +
          (review.professionalism +
            review.punctuality +
            review.serviceAttitude +
            review.valueForMoney) /
            4,
        0,
      ) / reviews.length
    : null;
  const primary = images[0] ?? null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    businessName: String(row.business_name),
    description: row.description == null ? null : String(row.description),
    categorySlug: category?.slug ?? "uncategorized",
    categoryName: category?.name ?? "Vendor",
    subcategorySlug: subcategory?.slug ?? null,
    subcategoryName: subcategory?.name ?? null,
    locationCity: row.location_city == null ? null : String(row.location_city),
    locationMode: row.location_mode === "fixed" ? "fixed" : "mobile",
    physicalArea: row.physical_area == null ? null : String(row.physical_area) as VendorArea,
    serviceAreas: Array.isArray(row.service_areas) ? row.service_areas.map(String) as VendorArea[] : [],
    minPriceMinor: row.min_price_minor == null ? null : Number(row.min_price_minor),
    maxPriceMinor: row.max_price_minor == null ? null : Number(row.max_price_minor),
    services: Array.isArray(row.services) ? row.services.map(String) : [],
    styles: Array.isArray(row.styles) ? row.styles.map(String) : [],
    eventTypes: Array.isArray(row.event_types) ? row.event_types.map(String) : [],
    minGuestCapacity: row.min_guest_capacity == null ? null : Number(row.min_guest_capacity),
    maxGuestCapacity: row.max_guest_capacity == null ? null : Number(row.max_guest_capacity),
    fridayAvailable: row.friday_available == null ? null : Boolean(row.friday_available),
    phone: row.phone == null ? null : String(row.phone),
    email: row.email == null ? null : String(row.email),
    websiteUrl: row.website_url == null ? null : String(row.website_url),
    instagramUrl: row.instagram_url == null ? null : String(row.instagram_url),
    imageUrl: imageUrl(primary, supabaseUrl),
    imageAlt: primary?.alt_text ?? `${row.business_name} wedding work`,
    gallery: images
      .map((image) => ({ id: image.id, url: imageUrl(image, supabaseUrl), alt: image.alt_text ?? "" }))
      .filter((image): image is { id: string; url: string; alt: string } => Boolean(image.url)),
    ratingAverage,
    reviewCount: reviews.length,
    reviews,
    recommendation: null,
    isSaved: false,
    lifecycleStatus: null,
  };
}

function filterDemoVendors(filters: VendorFilters): MarketplaceVendor[] {
  const search = filters.search?.toLocaleLowerCase();
  return demoVendors.filter((vendor) => {
    if (search && !`${vendor.businessName} ${vendor.locationCity ?? ""} ${vendor.description} ${vendor.services.join(" ")}`.toLocaleLowerCase().includes(search)) return false;
    if (filters.category && vendor.categorySlug !== filters.category) return false;
    if (filters.subcategory && vendor.subcategorySlug !== filters.subcategory) return false;
    if (filters.area && !vendorMatchesArea(vendor, filters.area)) return false;
    if (filters.minPrice != null && (vendor.maxPriceMinor ?? Number.POSITIVE_INFINITY) < filters.minPrice * 100) return false;
    if (filters.maxPrice != null && (vendor.minPriceMinor ?? 0) > filters.maxPrice * 100) return false;
    if (filters.minRating != null && (vendor.ratingAverage ?? 0) < filters.minRating) return false;
    if (filters.guestCount != null && ((vendor.minGuestCapacity ?? 0) > filters.guestCount || (vendor.maxGuestCapacity ?? Number.POSITIVE_INFINITY) < filters.guestCount)) return false;
    if (filters.friday && vendor.fridayAvailable !== true) return false;
    if (filters.service && !vendor.services.includes(filters.service)) return false;
    return true;
  });
}

async function getWeddingRecommendationContext() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "couple") return null;
  const supabase = await createClient();
  const { data: wedding } = await supabase.from("weddings")
    .select("id, preferred_area, total_budget_minor, styles, guest_count, event_type")
    .single();
  if (!wedding) return null;
  const [{ data: items, error: budgetError }, { data: relationships, error: relationshipError }] = await Promise.all([
    supabase.from("budget_items").select("committed_amount_minor, payments(amount_minor, is_paid)").eq("wedding_id", wedding.id),
    supabase.from("couple_vendors").select("vendor_id, status, is_saved").eq("wedding_id", wedding.id).not("vendor_id", "is", null),
  ]);
  if (relationshipError || !relationships) throw new Error("Your vendor relationships could not be loaded.");
  // Unavailable finance means an unknown match dimension, never a fabricated full budget.
  const available = budgetError || !items || items.some(item => !item.payments) ? null
    : calculateBudgetSummary(wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor), items.map(item => ({
      committedAmountMinor: item.committed_amount_minor == null ? null : Number(item.committed_amount_minor),
      payments: item.payments.map(p => ({ amountMinor: Number(p.amount_minor), isPaid: p.is_paid })),
    }))).availableMinor;
  return {
    preferredArea: wedding.preferred_area,
    availableBudgetMinor: available,
    styles: wedding.styles,
    guestCount: wedding.guest_count,
    eventType: wedding.event_type,
    relationships: new Map((relationships ?? []).flatMap((item) => item.vendor_id ? [[item.vendor_id, item] as const] : [])),
  };
}

export async function getMarketplaceSubcategories(): Promise<MarketplaceSubcategory[]> {
  if (!isSupabaseConfigured()) {
    return [...new Map(demoVendors.flatMap((vendor) => vendor.subcategorySlug && vendor.subcategoryName
      ? [[vendor.subcategorySlug, { slug: vendor.subcategorySlug, name: vendor.subcategoryName, categorySlug: vendor.categorySlug }] as const]
      : [])).values()];
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendor_subcategories")
    .select("slug, name, vendor_categories!inner(slug)").order("sort_order");
  if (error) throw new Error("Vendor subcategories could not be loaded.");
  return (data ?? []).map((row) => ({
    slug: row.slug, name: row.name,
    categorySlug: relationship(row.vendor_categories)?.slug ?? "",
  }));
}

export async function getMarketplace(filters: VendorFilters) {
  if (!isSupabaseConfigured()) {
    const all = filterDemoVendors(filters);
    if (filters.category && (filters.sort === "price_asc" || filters.sort === "price_desc")) all.sort((a,b) => {
      if (a.minPriceMinor == null || b.minPriceMinor == null) return a.minPriceMinor == null ? (b.minPriceMinor == null ? a.id.localeCompare(b.id) : 1) : -1;
      return (a.minPriceMinor - b.minPriceMinor) * (filters.sort === "price_desc" ? -1 : 1) || a.id.localeCompare(b.id);
    });
    const from = (filters.page - 1) * PAGE_SIZE;
    return { vendors: all.slice(from, from + PAGE_SIZE), total: all.length, pageSize: PAGE_SIZE, isPreview: true };
  }

  const supabase = await createClient();
  // A left-joined filter only filters the embedded record, not its parent vendor.
  // Keep vendors without a subcategory visible unless a subcategory is requested.
  const categoryJoin = filters.category ? "vendor_categories!inner(slug, name)" : "vendor_categories(slug, name)";
  const subcategoryJoin = filters.subcategory
    ? "vendor_subcategories!inner(slug, name)"
    : "vendor_subcategories(slug, name)";
  let query = supabase
    .from("vendor_profiles")
    .select(`*, ${categoryJoin}, ${subcategoryJoin}, vendor_images(id, storage_path, external_url, alt_text, sort_order, is_primary), reviews(id, reviewer_display_name, professionalism, punctuality, service_attitude, value_for_money, would_choose_again, review_text, created_at)`, { count: "exact" })
    .eq("is_public", true);
  if (filters.search) query = query.or(`business_name.ilike.%${filters.search.replaceAll(",", "")}%,location_city.ilike.%${filters.search.replaceAll(",", "")}%,description.ilike.%${filters.search.replaceAll(",", "")}%`);
  if (filters.category) query = query.eq("vendor_categories.slug", filters.category);
  if (filters.subcategory) query = query.eq("vendor_subcategories.slug", filters.subcategory);
  if (filters.area) query = query.or(`and(location_mode.eq.fixed,physical_area.eq.${filters.area}),and(location_mode.eq.mobile,service_areas.ov.{${filters.area},flexible})`);
  if (filters.minPrice != null) query = query.gte("max_price_minor", filters.minPrice * 100);
  if (filters.maxPrice != null) query = query.lte("min_price_minor", filters.maxPrice * 100);
  if (filters.guestCount != null) query = query.lte("min_guest_capacity", filters.guestCount).gte("max_guest_capacity", filters.guestCount);
  if (filters.friday) query = query.eq("friday_available", true);
  if (filters.service) query = query.contains("services", [filters.service]);
  // Sort comparable category starting prices before pagination; unknown prices remain last.
  const ordered = filters.category && (filters.sort === "price_asc" || filters.sort === "price_desc")
    ? query.order("min_price_minor", { ascending: filters.sort === "price_asc", nullsFirst: false }).order("id")
    : query.order("business_name").order("id");
  const from = (filters.page - 1) * PAGE_SIZE;
  const [marketplaceResult, context] = await Promise.all([
    filters.minRating == null
      ? ordered.range(from, from + PAGE_SIZE - 1)
      : ordered,
    getWeddingRecommendationContext(),
  ]);
  const { data, error, count } = marketplaceResult;
  if (error) throw new Error("The vendor marketplace could not be loaded.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  let vendors = (data ?? []).map((row) => mapVendor(row as VendorRow, url));
  let total = count ?? vendors.length;
  if (filters.minRating != null) {
    vendors = vendors.filter((vendor) => (vendor.ratingAverage ?? 0) >= filters.minRating!);
    total = vendors.length;
    vendors = vendors.slice(from, from + PAGE_SIZE);
  }
  if (context) {
    vendors = vendors.map((vendor) => ({
      ...vendor,
      isSaved: context.relationships.get(vendor.id)?.is_saved === true,
      lifecycleStatus: lifecycleFromStoredStatus(context.relationships.get(vendor.id)?.status),
      recommendation: calculateRecommendation(context, {
        locationMode: vendor.locationMode,
        physicalArea: vendor.physicalArea,
        serviceAreas: vendor.serviceAreas,
        minPriceMinor: vendor.minPriceMinor,
        maxPriceMinor: vendor.maxPriceMinor,
        styles: vendor.styles,
        minGuestCapacity: vendor.minGuestCapacity,
        maxGuestCapacity: vendor.maxGuestCapacity,
        eventTypes: vendor.eventTypes,
        ratingAverage: vendor.ratingAverage,
      }),
    }));
  }
  return { vendors, total, pageSize: PAGE_SIZE, isPreview: false };
}

export const getVendorBySlug = cache(async (slug: string): Promise<MarketplaceVendor | null> => {
  if (!isSupabaseConfigured()) return demoVendors.find((vendor) => vendor.slug === slug) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_profiles")
    .select("*, vendor_categories(slug, name), vendor_subcategories(slug, name), vendor_images(id, storage_path, external_url, alt_text, sort_order, is_primary), reviews(id, reviewer_display_name, professionalism, punctuality, service_attitude, value_for_money, would_choose_again, review_text, created_at)")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error || !data) return null;
  return mapVendor(data as VendorRow, process.env.NEXT_PUBLIC_SUPABASE_URL!);
});

// No client-supplied owner or slug: this route can only preview the signed-in Vendor's row.
export async function getOwnedVendorPreview(): Promise<MarketplaceVendor | null> {
  const account = await requireRole("vendor");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_profiles")
    .select("*, vendor_categories(slug, name), vendor_subcategories(slug, name), vendor_images(id, storage_path, external_url, alt_text, sort_order, is_primary), reviews(id, reviewer_display_name, professionalism, punctuality, service_attitude, value_for_money, would_choose_again, review_text, created_at)")
    .eq("owner_user_id", account.id)
    .maybeSingle();
  if (error || !data || data.owner_user_id !== account.id) return null;
  return mapVendor(data as VendorRow, process.env.NEXT_PUBLIC_SUPABASE_URL!);
}
