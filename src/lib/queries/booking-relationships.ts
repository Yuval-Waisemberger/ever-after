import type { createClient } from "@/lib/supabase/server";
import type { BookingRelationship } from "@/lib/domain/booking-state";
const one = <T>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value;
// Internal read; the caller must resolve an authenticated owned wedding first.
export async function readBookingRelationships(db: Awaited<ReturnType<typeof createClient>>, weddingId: string) {
  const relationships: BookingRelationship[] = [];
  try {
    const result = await db.from("couple_vendors").select("id, status, vendor_profiles(business_name, vendor_categories(slug), vendor_subcategories(slug)), external_vendors(business_name, vendor_categories(slug), vendor_subcategories(slug))")
      .eq("wedding_id", weddingId).order("id").limit(201);
    if (result.error || !result.data || result.data.length > 200) return { relationships, complete: false };
    let complete = true;
    for (const row of result.data) {
      const vendor = one(row.vendor_profiles) ?? one(row.external_vendors);
      if (!vendor) { complete = false; continue; }
      relationships.push({ id: row.id, status: row.status, businessName: vendor.business_name, category: one(vendor.vendor_categories)?.slug ?? null, subcategory: one(vendor.vendor_subcategories)?.slug ?? null });
    }
    return { relationships, complete };
  } catch { return { relationships: [], complete: false }; }
}
