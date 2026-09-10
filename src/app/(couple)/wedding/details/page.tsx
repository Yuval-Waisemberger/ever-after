import { SetupBookingsPanel } from "@/components/wedding/setup-bookings";
import { getSetupBookings } from "@/lib/queries/setup-bookings";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { WeddingDetailsForm } from "@/components/wedding/wedding-details-form";
import { getOwnedWedding } from "@/lib/queries/wedding";

export const metadata: Metadata = { title: "Wedding Details" };

export default async function WeddingDetailsPage() {
  const [wedding, bookings] = await Promise.all([getOwnedWedding(), getSetupBookings()]);
  return (
    <main className="ea-consistent-page mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Our Wedding" title="Wedding Details" description="Keep the details you know in one place. Anything undecided can stay open until you are ready." />
      <WeddingDetailsForm partnerOneName={wedding.partner_one_name} partnerTwoName={wedding.partner_two_name} values={{ revision: wedding.updated_at, weddingDate: wedding.wedding_date, venueStatus: wedding.venue_status, venueName: wedding.venue_name, guestCount: wedding.guest_count, preferredArea: wedding.preferred_area, eventType: wedding.event_type, styles: wedding.styles, priorities: wedding.priorities, bookedCategories: wedding.booked_categories, totalBudgetMinor: wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor) }} />
      <SetupBookingsPanel data={bookings} />
    </main>
  );
}
