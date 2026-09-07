import type { ActionState } from "@/lib/actions/state";
import type { BookingResult, SetupBookingInput } from "@/lib/actions/setup-bookings";
import { BOOKING_CATEGORIES, type BookingRelationship } from "@/lib/domain/booking-state";
export const fixture = { relationships: [] as BookingRelationship[], declarations: [] as string[], revision: "one", skipFailure: false, creates: 0, selectedId: "", price: "" };
export async function searchSetupVendors(input: { category: string; subcategory: string; search: string; page: number }) {
  if (input.search === "al") await new Promise(resolve => setTimeout(resolve, 900));
  const vendors = input.search === "zz" ? [] : Array.from({ length: 12 }, (_, i) => ({ id: `vendor-${i + 1}`, businessName: `${input.search === "al" ? "Old" : "Alma"} Studio ${i + 1} · סטודיו עם שם ארוך מאוד לאירועים`, city: "Jerusalem", subcategory: input.subcategory === "makeup-hair" ? "Makeup & Hair" : "Photographer" }));
  return { status: "success" as const, vendors, hasMore: true };
}
export async function bookSetupVendor(input: SetupBookingInput): Promise<BookingResult> {
  fixture.creates++;
  fixture.selectedId = input.vendorId ?? "external"; fixture.price = String(input.agreedPriceShekels ?? "");
  if (input.businessName === "Uncertain") return { status: "error", creationAttempted: true, message: "The booking outcome is uncertain. Review Our Vendors." };
  fixture.relationships.push({ id: input.vendorId ?? "external", status: "booked", category: "photography-content", subcategory: "wedding-photographers", businessName: input.businessName ?? "Studio 1 · סטודיו" });
  fixture.declarations = fixture.declarations.filter(d => d !== "Photographer");
  fixture.revision = "two";
  return { status: "success", message: "Vendor booked. Record any actual payments in Budget." };
}
export async function saveBookingDeclaration(input: { category: string; operation: string }): Promise<BookingResult> {
  const label = BOOKING_CATEGORIES.find(c => c.key === input.category)!.label;
  fixture.declarations = input.operation === "add" ? [...fixture.declarations, label] : fixture.declarations.filter(d => d !== label);
  return { status: "success", message: "Declaration saved. No vendor or payment created." };
}
export async function completeWeddingSetup(_state: ActionState, form: FormData): Promise<ActionState> {
  if (Number(form.get("guestCount")) > 5000) return { status: "error", errors: { guestCount: ["Guest estimate must be 1–5,000."] } };
  return { status: "error", message: "Fixture preferences saved without creating vendors." };
}
export async function saveWeddingDetails(_state: ActionState, form: FormData): Promise<ActionState> {
  return { status: "error", message: form.get("revision") !== fixture.revision ? "Wedding Details changed since this form opened. Reload before saving." : "Fixture details saved." };
}
export async function skipWeddingSetup(): Promise<ActionState> {
  return { status: "error", message: fixture.skipFailure ? "Setup could not be skipped. Please try again." : "Skipped without saving unsaved fields." };
}
