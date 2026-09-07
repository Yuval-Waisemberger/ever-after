import type { createClient } from "@/lib/supabase/server";
type DB = Awaited<ReturnType<typeof createClient>>;
type Lifecycle = "saved" | "contacted" | "considering" | "booked" | "rejected";

// Internal operations; callers authenticate/resolve ownership and validate input first.
// Omitted patch fields remain omitted. Only the database writes booking commitments.
export async function writeMarketplaceRelationship(db: DB, weddingId: string, vendorId: string, status: Lifecycle,
  patch: { agreed_price_minor?: number | null; private_notes?: string | null } = {}) {
  const current = await db.from("couple_vendors").select("id").eq("wedding_id", weddingId).eq("vendor_id", vendorId).maybeSingle();
  if (current.error) return { data: null, error: current.error };
  const values = { wedding_id: weddingId, vendor_id: vendorId, status, ...patch };
  const mutation = current.data
    ? db.from("couple_vendors").update(values).eq("id", current.data.id).eq("wedding_id", weddingId)
    : db.from("couple_vendors").insert({ ...values, is_saved: false });
  return mutation.select("id").single();
}

export async function createExternalRelationship(db: DB, weddingId: string,
  external: { business_name: string; category_id: string | null; subcategory_id: string | null; contact_name?: string | null; phone?: string | null; email?: string | null; website_url?: string | null; notes?: string | null },
  relationship: { status: Lifecycle; is_saved: boolean; agreed_price_minor: number | null }) {
  const created = await db.from("external_vendors").insert({ ...external, wedding_id: weddingId }).select("id").single();
  if (created.error || !created.data) return { ok: false as const };
  const linked = await db.from("couple_vendors").insert({ wedding_id: weddingId, vendor_id: null, external_vendor_id: created.data.id, ...relationship });
  if (linked.error) {
    // Deletion is itself protected by 050003 if a committed booking/history exists.
    await db.from("external_vendors").delete().eq("id", created.data.id).eq("wedding_id", weddingId);
    return { ok: false as const };
  }
  return { ok: true as const, externalVendorId: created.data.id };
}
