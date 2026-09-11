import { getCurrentProfile } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "./wedding";
import { publicVendorAsLegacyRelation, readPublicVendorAssets, readPublicVendorsByIds, type PublicVendorLegacyRelation } from "./public-vendor-data";
import type { StoredVendorStatus } from "@/lib/domain/couple-vendors";

export type CoupleVendorTaxonomy = Array<{
  id: string;
  name: string;
  vendor_subcategories: Array<{ id: string; name: string }>;
}>;

type OwnedReviewResult = {
  id: string;
  vendor_id: string;
  professionalism: number;
  punctuality: number;
  service_attitude: number;
  value_for_money: number;
  would_choose_again: boolean;
  review_text: string | null;
  updated_at: string;
  vendor_profiles: PublicVendorLegacyRelation | PublicVendorLegacyRelation[] | null;
};
type ExternalVendorRelation = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  notes: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  vendor_categories: { name: string } | Array<{ name: string }> | null;
  vendor_subcategories: { name: string } | Array<{ name: string }> | null;
};
type OwnedVendorResult = {
  id: string;
  vendor_id: string | null;
  external_vendor_id: string | null;
  status: StoredVendorStatus;
  is_saved: boolean;
  agreed_price_minor: number | string | null;
  private_notes: string | null;
  contact_override: string | null;
  payment_reference: string | null;
  vendor_profiles: PublicVendorLegacyRelation | PublicVendorLegacyRelation[] | null;
  external_vendors: ExternalVendorRelation | ExternalVendorRelation[] | null;
};

export async function getVendorRelationship(vendorId: string) {
  if (!isSupabaseConfigured()) return null;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "couple") return null;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data } = await supabase
    .from("couple_vendors")
    .select("id, status, is_saved, agreed_price_minor, private_notes")
    .eq("wedding_id", wedding.id)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  return data;
}

export async function getMyVendors(status?: string) {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  let query = supabase
    .from("couple_vendors")
    .select("id, vendor_id, external_vendor_id, status, is_saved, agreed_price_minor, private_notes, contact_override, payment_reference, external_vendors(id, business_name, contact_name, phone, email, website_url, notes, category_id, subcategory_id, vendor_categories(name), vendor_subcategories(name))")
    .eq("wedding_id", wedding.id)
    .order("updated_at", { ascending: false });
  if (status === "saved") {
    query = query.eq("is_saved", true);
  } else if (["contacted", "considering", "booked", "rejected"].includes(status ?? "")) {
    query = query.eq("status", status!);
  }
  const { data, error } = await query;
  if (error) throw new Error("Our Vendors could not be loaded.");
  const rows = data ?? [];
  const vendorIds = rows.flatMap((row) => row.vendor_id ? [row.vendor_id] : []);
  const [vendors, assets] = await Promise.all([
    readPublicVendorsByIds(supabase, vendorIds),
    readPublicVendorAssets(supabase, vendorIds, { images: true, reviews: false }),
  ]);
  const byId = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  return rows.map((row) => {
    const vendor = row.vendor_id ? byId.get(row.vendor_id) : null;
    return {
      ...row,
      vendor_profiles: vendor
        ? publicVendorAsLegacyRelation(vendor, assets.imagesByVendorId.get(vendor.id) ?? [])
        : null,
    };
  }) as OwnedVendorResult[];
}

export async function getCoupleVendorTaxonomy(): Promise<CoupleVendorTaxonomy> {
  await getOwnedWedding();
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendor_categories")
    .select("id, name, vendor_subcategories(id, name)")
    .order("sort_order");
  if (error) throw new Error("Vendor categories could not be loaded.");
  return (data ?? []) as CoupleVendorTaxonomy;
}

export async function getMyReviews() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, vendor_id, professionalism, punctuality, service_attitude, value_for_money, would_choose_again, review_text, updated_at")
    .eq("wedding_id", wedding.id)
    .eq("is_seeded", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Your reviews could not be loaded.");
  const rows = data ?? [];
  const vendorIds = rows.map((row) => row.vendor_id);
  const [vendors, assets] = await Promise.all([
    readPublicVendorsByIds(supabase, vendorIds),
    readPublicVendorAssets(supabase, vendorIds, { images: true, reviews: false }),
  ]);
  const byId = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  return rows.map((row) => {
    const vendor = byId.get(row.vendor_id);
    return {
      ...row,
      vendor_profiles: vendor
        ? publicVendorAsLegacyRelation(vendor, assets.imagesByVendorId.get(vendor.id) ?? [])
        : null,
    };
  }) as OwnedReviewResult[];
}
