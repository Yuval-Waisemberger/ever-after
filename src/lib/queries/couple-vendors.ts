import { getCurrentProfile } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "./wedding";

export async function getVendorRelationship(vendorId: string) {
  if (!isSupabaseConfigured()) return null;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "couple") return null;
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data } = await supabase
    .from("couple_vendors")
    .select("id, status, agreed_price_minor, private_notes")
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
    .select("id, vendor_id, status, agreed_price_minor, private_notes, contact_override, payment_reference, vendor_profiles(slug, business_name, description, phone, email, vendor_categories(name), vendor_subcategories(name), vendor_images(external_url, storage_path, alt_text, is_primary, sort_order))")
    .eq("wedding_id", wedding.id)
    .order("updated_at", { ascending: false });
  if (["saved", "contacted", "considering", "booked", "rejected"].includes(status ?? "")) {
    query = query.eq("status", status!);
  }
  const { data, error } = await query;
  if (error) throw new Error("My Vendors could not be loaded.");
  return data ?? [];
}
