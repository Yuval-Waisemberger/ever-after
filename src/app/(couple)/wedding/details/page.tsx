import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { WeddingDetailsForm } from "@/components/wedding/wedding-details-form";
import { getOwnedWedding } from "@/lib/queries/wedding";

export const metadata: Metadata = { title: "Wedding Details" };

export default async function WeddingDetailsPage() {
  const wedding = await getOwnedWedding();
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="My Wedding" title="Wedding Details" description="This is the one source of truth for your wedding. Missing details stay unset, and every detail remains editable." />
      <WeddingDetailsForm partnerOneName={wedding.partner_one_name} partnerTwoName={wedding.partner_two_name} values={{ weddingDate: wedding.wedding_date, venueStatus: wedding.venue_status, venueName: wedding.venue_name, guestCount: wedding.guest_count, preferredArea: wedding.preferred_area, eventType: wedding.event_type, styles: wedding.styles, priorities: wedding.priorities, bookedCategories: wedding.booked_categories, totalBudgetMinor: wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor) }} />
    </main>
  );
}
