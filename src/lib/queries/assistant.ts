import { createClient } from "@/lib/supabase/server";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { getOwnedWedding } from "./wedding";
import { getTasks } from "./tasks";
import type { AssistantContext, AssistantVendor } from "@/lib/assistant/types";

type AssistantReviewRow = {
  professionalism: number;
  punctuality: number;
  service_attitude: number;
  value_for_money: number;
};

type AssistantVendorImageRow = {
  external_url: string | null;
  storage_path: string | null;
  alt_text: string | null;
  is_primary: boolean;
};

type AssistantVendorRow = Omit<AssistantVendor, "status" | "agreedPriceMinor" | "privateNotes" | "gallery" | "reviews" | "recommendation" | "imageUrl" | "imageAlt" | "ratingAverage" | "reviewCount" | "businessName" | "categorySlug" | "categoryName" | "subcategorySlug" | "subcategoryName" | "locationCity" | "serviceAreas" | "minPriceMinor" | "maxPriceMinor" | "eventTypes" | "minGuestCapacity" | "maxGuestCapacity" | "fridayAvailable" | "websiteUrl" | "instagramUrl"> & {
  business_name: string;
  description: string | null;
  location_city: string | null;
  service_areas: string[];
  min_price_minor: number | string | null;
  max_price_minor: number | string | null;
  event_types: string[];
  min_guest_capacity: number | null;
  max_guest_capacity: number | null;
  friday_available: boolean | null;
  website_url: string | null;
  instagram_url: string | null;
  vendor_categories: { slug: string; name: string } | Array<{ slug: string; name: string }> | null;
  vendor_subcategories: { slug: string; name: string } | Array<{ slug: string; name: string }> | null;
  vendor_images: AssistantVendorImageRow[] | null;
  reviews: AssistantReviewRow[] | null;
};

type AssistantRelationshipRow = {
  status: AssistantVendor["status"];
  agreed_price_minor: number | string | null;
  private_notes: string | null;
  vendor_profiles: AssistantVendorRow | AssistantVendorRow[] | null;
};

export async function getAssistantContext(): Promise<AssistantContext> {
  const [wedding, tasks] = await Promise.all([getOwnedWedding(), getTasks()]);
  const supabase = await createClient();
  const [{ data: relationships }, { data: items }] = await Promise.all([
    supabase.from("couple_vendors").select("status, agreed_price_minor, private_notes, vendor_profiles(id, slug, business_name, description, location_city, service_areas, min_price_minor, max_price_minor, services, styles, event_types, min_guest_capacity, max_guest_capacity, friday_available, phone, email, website_url, instagram_url, vendor_categories(slug, name), vendor_subcategories(slug, name), vendor_images(external_url, storage_path, alt_text, is_primary), reviews(professionalism, punctuality, service_attitude, value_for_money))").eq("wedding_id", wedding.id),
    supabase.from("budget_items").select("estimated_amount_minor, committed_amount_minor, payments(amount_minor, is_paid, due_date)").eq("wedding_id", wedding.id),
  ]);
  const budget = calculateBudgetSummary(wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor), (items ?? []).map((item) => ({ estimatedAmountMinor: item.estimated_amount_minor == null ? null : Number(item.estimated_amount_minor), committedAmountMinor: item.committed_amount_minor == null ? null : Number(item.committed_amount_minor), payments: (item.payments ?? []).map((payment) => ({ amountMinor: Number(payment.amount_minor), isPaid: payment.is_paid, dueDate: payment.due_date })) })));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const vendors: AssistantVendor[] = ((relationships ?? []) as AssistantRelationshipRow[]).flatMap((relationship) => {
    const vendor = Array.isArray(relationship.vendor_profiles) ? relationship.vendor_profiles[0] : relationship.vendor_profiles;
    if (!vendor) return [];
    const category = Array.isArray(vendor.vendor_categories) ? vendor.vendor_categories[0] : vendor.vendor_categories;
    const subcategory = Array.isArray(vendor.vendor_subcategories) ? vendor.vendor_subcategories[0] : vendor.vendor_subcategories;
    const image = (vendor.vendor_images ?? []).find((candidate) => candidate.is_primary) ?? vendor.vendor_images?.[0];
    const reviews = vendor.reviews ?? [];
    const ratingAverage = reviews.length ? reviews.reduce((sum: number, review) => sum + (review.professionalism + review.punctuality + review.service_attitude + review.value_for_money) / 4, 0) / reviews.length : null;
    const storedImageUrl = image?.storage_path
      ? `${supabaseUrl}/storage/v1/object/public/vendor-media/${image.storage_path}`
      : null;
    return [{ id: vendor.id, slug: vendor.slug, businessName: vendor.business_name, description: vendor.description, categorySlug: category?.slug ?? "", categoryName: category?.name ?? "Vendor", subcategorySlug: subcategory?.slug ?? null, subcategoryName: subcategory?.name ?? null, locationCity: vendor.location_city, serviceAreas: vendor.service_areas ?? [], minPriceMinor: vendor.min_price_minor == null ? null : Number(vendor.min_price_minor), maxPriceMinor: vendor.max_price_minor == null ? null : Number(vendor.max_price_minor), services: vendor.services ?? [], styles: vendor.styles ?? [], eventTypes: vendor.event_types ?? [], minGuestCapacity: vendor.min_guest_capacity, maxGuestCapacity: vendor.max_guest_capacity, fridayAvailable: vendor.friday_available, phone: vendor.phone, email: vendor.email, websiteUrl: vendor.website_url, instagramUrl: vendor.instagram_url, imageUrl: image?.external_url ?? storedImageUrl, imageAlt: image?.alt_text ?? "", gallery: [], ratingAverage, reviewCount: reviews.length, reviews: [], status: relationship.status, agreedPriceMinor: relationship.agreed_price_minor == null ? null : Number(relationship.agreed_price_minor), privateNotes: relationship.private_notes }];
  });
  return { wedding: { weddingDate: wedding.wedding_date, guestCount: wedding.guest_count, preferredArea: wedding.preferred_area, eventType: wedding.event_type, styles: wedding.styles ?? [], priorities: wedding.priorities ?? [], totalBudgetMinor: wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor), setupStatus: wedding.setup_status }, tasks: tasks.map((task) => ({ id: task.id, title: task.title, dueDate: task.due_date, status: task.status, priority: task.priority })), vendors, budget: { committedMinor: budget.committedMinor, paidMinor: budget.paidMinor, availableMinor: budget.availableMinor, upcomingPayments: budget.upcomingPayments.map((payment) => ({ amountMinor: payment.amountMinor, dueDate: payment.dueDate })) } };
}

export async function getLatestAssistantThread() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data: thread } = await supabase.from("assistant_threads").select("id, title").eq("wedding_id", wedding.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!thread) return { thread: null, messages: [] };
  const { data: messages } = await supabase.from("assistant_messages").select("id, role, content, source_labels, created_at").eq("thread_id", thread.id).order("created_at").limit(100);
  return { thread, messages: messages ?? [] };
}
