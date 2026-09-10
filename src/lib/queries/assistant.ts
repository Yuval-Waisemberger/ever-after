import { createClient } from "@/lib/supabase/server";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { getOwnedWedding } from "./wedding";
import { getTasks } from "./tasks";
import type { AssistantContext, AssistantVendor } from "@/lib/assistant/types";
import { lifecycleFromStoredStatus, type StoredVendorStatus } from "@/lib/domain/couple-vendors";
import { getGuestSummary } from "./guests";
import { AssistantContextUnavailableError, readAssistantSection } from "@/lib/assistant/context-error";

type AssistantVendorRow = {
  id: string;
  business_name: string;
  location_mode: "fixed" | "mobile";
  physical_area: string | null;
  service_areas: string[];
  min_price_minor: number | string | null;
  max_price_minor: number | string | null;
  event_types: string[];
  min_guest_capacity: number | null;
  max_guest_capacity: number | null;
  services: string[];
  styles: string[];
  reviews: Array<{ professionalism: number; punctuality: number; service_attitude: number; value_for_money: number }> | null;
};
type AssistantExternalVendorRow = { id: string; business_name: string };
type AssistantRelationshipRow = {
  status: StoredVendorStatus;
  is_saved: boolean;
  agreed_price_minor: number | string | null;
  vendor_profiles: AssistantVendorRow | AssistantVendorRow[] | null;
  external_vendors: AssistantExternalVendorRow | AssistantExternalVendorRow[] | null;
};

export async function getAssistantContext(): Promise<AssistantContext> {
  const [wedding, tasks, guestList] = await Promise.all([
    readAssistantSection("wedding", getOwnedWedding),
    readAssistantSection("tasks", getTasks),
    readAssistantSection("guestList", getGuestSummary),
  ]);
  const supabase = await createClient();
  const [relationshipResult, budgetResult] = await Promise.all([
    readAssistantSection("vendors", () => supabase.from("couple_vendors")
      .select("status, is_saved, agreed_price_minor, vendor_profiles(id, business_name, location_mode, physical_area, service_areas, min_price_minor, max_price_minor, services, styles, event_types, min_guest_capacity, max_guest_capacity, reviews(professionalism, punctuality, service_attitude, value_for_money)), external_vendors(id, business_name)")
      .eq("wedding_id", wedding.id)),
    readAssistantSection("budget", () => supabase.from("budget_items")
      .select("source, couple_vendors(status), estimated_amount_minor, committed_amount_minor, payments(amount_minor, is_paid, due_date)")
      .eq("wedding_id", wedding.id)),
  ]);
  // A successful empty array means no records. Failure/null data never means zero.
  if (relationshipResult.error || !relationshipResult.data) throw new AssistantContextUnavailableError("vendors");
  if (budgetResult.error || !budgetResult.data) throw new AssistantContextUnavailableError("budget");
  const budget = calculateBudgetSummary(wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor), budgetResult.data.map((item) => {
    if (!item.payments) throw new AssistantContextUnavailableError("budget");
    return {
      source: item.source as "manual" | "booked_vendor",
      relationshipStatus: (Array.isArray(item.couple_vendors) ? item.couple_vendors[0] : item.couple_vendors)?.status ?? null,
      estimatedAmountMinor: item.estimated_amount_minor == null ? null : Number(item.estimated_amount_minor),
      committedAmountMinor: item.committed_amount_minor == null ? null : Number(item.committed_amount_minor),
      payments: item.payments.map((payment) => ({ amountMinor: Number(payment.amount_minor), isPaid: payment.is_paid, dueDate: payment.due_date })),
    };
  }));
  const vendors = (relationshipResult.data as AssistantRelationshipRow[]).map<AssistantVendor>((relationship) => {
    const vendor = Array.isArray(relationship.vendor_profiles) ? relationship.vendor_profiles[0] : relationship.vendor_profiles;
    const external = Array.isArray(relationship.external_vendors) ? relationship.external_vendors[0] : relationship.external_vendors;
    const identity = external ?? vendor;
    if (!identity) throw new AssistantContextUnavailableError("vendors");
    const reviews = vendor?.reviews ?? [];
    const ratingAverage = reviews.length ? reviews.reduce((sum, review) => sum + (review.professionalism + review.punctuality + review.service_attitude + review.value_for_money) / 4, 0) / reviews.length : null;
    return {
      id: identity.id, businessName: identity.business_name, source: external ? "external" : "marketplace",
      isSaved: relationship.is_saved, lifecycleStatus: lifecycleFromStoredStatus(relationship.status),
      agreedPriceMinor: relationship.agreed_price_minor == null ? null : Number(relationship.agreed_price_minor),
      minPriceMinor: vendor?.min_price_minor == null ? null : Number(vendor.min_price_minor),
      maxPriceMinor: vendor?.max_price_minor == null ? null : Number(vendor.max_price_minor),
      services: vendor?.services ?? [], styles: vendor?.styles ?? [], locationMode: vendor?.location_mode ?? "mobile",
      physicalArea: vendor?.physical_area ?? null, serviceAreas: vendor?.service_areas ?? [],
      eventTypes: vendor?.event_types ?? [], minGuestCapacity: vendor?.min_guest_capacity ?? null,
      maxGuestCapacity: vendor?.max_guest_capacity ?? null, ratingAverage,
    };
  });
  return {
    wedding: {
      weddingDate: wedding.wedding_date, guestCount: wedding.guest_count, preferredArea: wedding.preferred_area,
      eventType: wedding.event_type, styles: wedding.styles ?? [], priorities: wedding.priorities ?? [],
      totalBudgetMinor: wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor), setupStatus: wedding.setup_status,
    },
    tasks: tasks.map((task) => ({ id: task.id, title: task.title, dueDate: task.due_date, status: task.status, priority: task.priority })),
    guestList: { invited: guestList.invited, attending: guestList.attending, awaitingResponse: guestList.awaitingResponse, notAttending: guestList.notAttending, notYetInvited: guestList.notYetInvited },
    vendors,
    budget: {
      committedMinor: budget.committedMinor, paidMinor: budget.paidMinor, availableMinor: budget.availableMinor,
      // The shared budget helper's legacy upcomingPayments field contains active unpaid payments (including overdue).
      unpaidPayments: budget.upcomingPayments.map((payment) => ({ amountMinor: payment.amountMinor, dueDate: payment.dueDate ?? null })),
    },
  };
}

export async function getLatestAssistantThread() {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data: thread, error: threadError } = await supabase.from("assistant_threads").select("id, title").eq("wedding_id", wedding.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (threadError) throw new Error("Assistant conversation could not be loaded.");
  if (!thread) return { thread: null, messages: [] };
  const { data: messages, error: messageError } = await supabase.from("assistant_messages").select("id, role, content, source_labels, created_at").eq("thread_id", thread.id).order("created_at").limit(100);
  if (messageError || !messages) throw new Error("Assistant messages could not be loaded.");
  return { thread, messages };
}
