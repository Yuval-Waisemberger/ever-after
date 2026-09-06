import { getCurrentProfile } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "./wedding";

export type CoupleVendorTaxonomy = Array<{
  id: string;
  name: string;
  vendor_subcategories: Array<{ id: string; name: string }>;
}>;

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
    .select("id, vendor_id, external_vendor_id, status, is_saved, agreed_price_minor, private_notes, contact_override, payment_reference, vendor_profiles(slug, business_name, description, phone, email, vendor_categories(name), vendor_subcategories(name), vendor_images(external_url, storage_path, alt_text, is_primary, sort_order)), external_vendors(id, business_name, contact_name, phone, email, website_url, notes, category_id, subcategory_id, vendor_categories(name), vendor_subcategories(name))")
    .eq("wedding_id", wedding.id)
    .order("updated_at", { ascending: false });
  if (status === "saved") {
    query = query.eq("is_saved", true);
  } else if (["contacted", "considering", "booked", "rejected"].includes(status ?? "")) {
    query = query.eq("status", status!);
  }
  const { data, error } = await query;
  if (error) throw new Error("Our Vendors could not be loaded.");
  return data ?? [];
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
    .select("id, vendor_id, professionalism, punctuality, service_attitude, value_for_money, would_choose_again, review_text, updated_at, vendor_profiles(slug, business_name, vendor_images(external_url, storage_path, alt_text, is_primary, sort_order))")
    .eq("wedding_id", wedding.id)
    .eq("is_seeded", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Your reviews could not be loaded.");
  return data ?? [];
}
