import { readBookingRelationships } from "./booking-relationships";
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "./wedding";
import { BOOKING_CATEGORIES, categoryBookingState } from "@/lib/domain/booking-state";
const one = <T>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value;
export async function getSetupBookings() {
  const wedding = await getOwnedWedding();
  const db = await createClient();
  const { relationships, complete } = await readBookingRelationships(db, wedding.id);
  let taxonomy: Array<{ id: string; slug: string; name: string; category: string; categoryId: string }> = [];
  try {
    const types = await db.from("vendor_subcategories").select("id, slug, name, category_id, vendor_categories!inner(slug)").order("sort_order").limit(101);
    if (!types.error && types.data && types.data.length <= 100) taxonomy = types.data.map(t => ({ id: t.id, slug: t.slug, name: t.name, category: one(t.vendor_categories)!.slug, categoryId: t.category_id }));
  } catch { taxonomy = []; }
  return { complete, relationships, taxonomy, legacyVenueName: wedding.venue_name as string | null,
    categories: BOOKING_CATEGORIES.map(c => categoryBookingState(c.key, { relationships, declarations: wedding.booked_categories, complete, legacyVenueStatus: wedding.venue_status })) };
}
export type SetupBookings = Awaited<ReturnType<typeof getSetupBookings>>;
