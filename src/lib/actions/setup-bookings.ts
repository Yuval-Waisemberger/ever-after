"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { createClient } from "@/lib/supabase/server";
import { getSetupBookings } from "@/lib/queries/setup-bookings";
import { getMarketplace } from "@/lib/queries/vendors";
import { BOOKING_CATEGORIES, type BookingCategory } from "@/lib/domain/booking-state";
import { writeMarketplaceRelationship, createExternalRelationship } from "@/lib/vendors/relationship-write";

const category = z.enum(BOOKING_CATEGORIES.map(c => c.key));
const inputSchema = z.object({ category, mode: z.enum(["marketplace", "external"]), vendorId: z.string().uuid().optional(),
  subcategory: z.string().min(1).max(100), businessName: z.string().trim().min(1).max(120).optional(),
  agreedPriceShekels: z.number().int().min(0).max(100_000_000).optional() }).strict();
export type SetupBookingInput = z.input<typeof inputSchema>;
export type BookingResult = { status: "success" | "error" | "review"; message: string; creationAttempted?: boolean };
function refresh() {
  for (const path of ["/wedding", "/wedding/setup", "/wedding/details", "/vendors", "/vendors/my", "/budget", "/assistant"]) revalidatePath(path);
}
function allowed(key: BookingCategory, slug: string) {
  const map = BOOKING_CATEGORIES.find(c => c.key === key)!;
  return key === "other" || map.subcategories.some(s => s === slug);
}
export async function searchSetupVendors(raw: unknown) {
  const input = z.object({ category, subcategory: z.string().min(1).max(100), search: z.string().trim().max(80).regex(/^[\p{L}\p{N} .'-]*$/u), page: z.number().int().min(1).max(50) }).strict().safeParse(raw);
  await getOwnedWedding();
  if (!input.success || !allowed(input.data.category, input.data.subcategory)) return { status: "unavailable" as const, vendors: [], hasMore: false };
  try {
    const result = await getMarketplace({ subcategory: input.data.subcategory, search: input.data.search, page: input.data.page });
    if (result.isPreview) throw new Error("Unavailable");
    return { status: "success" as const, vendors: result.vendors.slice(0, 12).map(v => ({ id: v.id, businessName: v.businessName, city: v.locationCity, subcategory: v.subcategoryName })), hasMore: result.total > input.data.page * result.pageSize };
  } catch { return { status: "unavailable" as const, vendors: [], hasMore: false }; }
}

async function declarations(key: BookingCategory, operation: "add" | "remove" | "looking" | "not_yet") {
  const wedding = await getOwnedWedding();
  const db = await createClient();
  // Fresh read, then compare-and-set: never overwrite a concurrent preferences/declaration save.
  const current = await db.from("weddings").select("booked_categories, updated_at").eq("id", wedding.id).single();
  if (current.error || !current.data) return false;
  const label = BOOKING_CATEGORIES.find(c => c.key === key)!.label;
  const values = new Set<string>(current.data.booked_categories);
  if (operation === "add") values.add(label); else values.delete(label);
  const result = await db.from("weddings").update({ booked_categories: [...values],
    ...(key === "venue" ? { venue_status: operation === "looking" || operation === "not_yet" ? operation : null } : {}) })
    .eq("id", wedding.id).eq("updated_at", current.data.updated_at).select("id").single();
  return !result.error && Boolean(result.data);
}
export async function saveBookingDeclaration(raw: unknown): Promise<BookingResult> {
  const input = z.object({ category, operation: z.enum(["add", "remove", "looking", "not_yet"]) }).strict().safeParse(raw);
  await getOwnedWedding();
  if (!input.success || (input.data.category !== "venue" && ["looking", "not_yet"].includes(input.data.operation))) return { status: "error", message: "Choose a valid category." };
  try {
    const state = await getSetupBookings();
    if (!state.complete) return { status: "error", message: "Current bookings could not be checked. Refresh before changing the declaration." };
    const existing = state.categories.find(c => c.category === input.data.category);
    if (input.data.operation !== "remove" && existing?.confirmedIds.length) return { status: "error", message: "This category has a confirmed booking. Change the vendor lifecycle in Our Vendors first." };
    if (!await declarations(input.data.category, input.data.operation)) return { status: "error", message: "The declaration could not be saved. Refresh to review the latest details." };
    refresh(); return { status: "success", message: "Planning declaration saved. This does not book a vendor or change payments." };
  } catch { return { status: "error", message: "The declaration could not be confirmed. Refresh before trying again." }; }
}
export async function bookSetupVendor(raw: unknown): Promise<BookingResult> {
  const input = inputSchema.safeParse(raw);
  const wedding = await getOwnedWedding();
  if (!input.success || !allowed(input.data.category, input.data.subcategory)) return { status: "error", message: "Check the vendor, category and agreed price." };
  const value = input.data;
  const db = await createClient();
  let confirmed = false, creationAttempted = false;
  try {
    const tax = await db.from("vendor_subcategories").select("id, category_id, vendor_categories!inner(slug)").eq("slug", value.subcategory).single();
    const parent = tax.data && (Array.isArray(tax.data.vendor_categories) ? tax.data.vendor_categories[0] : tax.data.vendor_categories);
    const map = BOOKING_CATEGORIES.find(c => c.key === value.category)!;
    if (tax.error || !tax.data || !parent || (map.category && parent.slug !== map.category)) return { status: "error", message: "This vendor category is unavailable." };
    if (value.mode === "marketplace") {
      if (!value.vendorId) return { status: "error", message: "Select a Marketplace vendor." };
      const vendor = await db.from("vendor_profiles").select("id").eq("id", value.vendorId).eq("is_public", true).eq("subcategory_id", tax.data.id).eq("category_id", tax.data.category_id).single();
      if (vendor.error || !vendor.data) return { status: "error", message: "The selected vendor is unavailable or belongs to another category." };
      const result = await writeMarketplaceRelationship(db, wedding.id, value.vendorId, "booked",
        value.agreedPriceShekels === undefined ? {} : { agreed_price_minor: value.agreedPriceShekels * 100 });
      confirmed = !result.error && Boolean(result.data);
    } else {
      if (!value.businessName) return { status: "error", message: "Enter the external vendor's business name." };
      creationAttempted = true;
      const result = await createExternalRelationship(db, wedding.id, { business_name: value.businessName, category_id: tax.data.category_id, subcategory_id: tax.data.id },
        { status: "booked", is_saved: false, agreed_price_minor: value.agreedPriceShekels == null ? null : value.agreedPriceShekels * 100 });
      confirmed = result.ok;
    }
    if (!confirmed) return { status: "error", creationAttempted, message: "The booking could not be confirmed. Review Our Vendors before trying again." };
    const cleaned = await declarations(value.category, "remove");
    refresh();
    return { status: cleaned ? "success" : "review", creationAttempted,
      message: cleaned ? "Vendor booked. Record any actual payments in Budget." : "Vendor booked, but the details-later declaration needs review. Do not book it again." };
  } catch {
    if (confirmed) refresh();
    return { status: confirmed ? "review" : "error", creationAttempted,
      message: confirmed ? "Vendor booked. Refresh to review the remaining declaration; do not book again." : "The booking outcome could not be confirmed. Review Our Vendors before trying again." };
  }
}
