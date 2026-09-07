import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SetupWizard } from "@/components/wedding/setup-wizard";
import { WeddingDetailsForm } from "@/components/wedding/wedding-details-form";
import { SetupBookingsPanel } from "@/components/wedding/setup-bookings";
import { BOOKING_CATEGORIES, categoryBookingState } from "@/lib/domain/booking-state";
import { fixture } from "./actions";
import "@/app/globals.css";
function Fixture() {
  const [, render] = useState(0);
  useEffect(() => { const refresh = () => render(n => n + 1); window.addEventListener("fixture-refresh", refresh); return () => window.removeEventListener("fixture-refresh", refresh); }, []);
  const data = { complete: true, relationships: fixture.relationships, legacyVenueName: null,
    taxonomy: [{ id: "photo", slug: "wedding-photographers", name: "Wedding Photographers", category: "photography-content", categoryId: "parent" }],
    categories: BOOKING_CATEGORIES.map(c => categoryBookingState(c.key, { relationships: fixture.relationships, declarations: fixture.declarations, complete: true })) };
  return <main className="mx-auto max-w-4xl p-5">
    <h1>Isolated Setup fixture — no database</h1>
    <button type="button" onClick={() => { fixture.skipFailure = true; }}>Simulate skip failure</button>
    <output aria-label="Booking creates">{fixture.creates}</output>
    <output aria-label="Selected vendor ID">{fixture.selectedId}</output>
    <output aria-label="Booking price">{fixture.price}</output>
    <SetupWizard values={{ revision: fixture.revision }} />
    <SetupBookingsPanel data={data} />
    <WeddingDetailsForm partnerOneName="One" partnerTwoName="Two" values={{ revision: fixture.revision }} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
