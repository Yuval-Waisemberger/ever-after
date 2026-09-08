import { AppShell } from "@/components/layout/app-shell";
import "@/app/couple-planning.css";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SetupWizard } from "@/components/wedding/setup-wizard";
import { WeddingDetailsForm } from "@/components/wedding/wedding-details-form";
import { SetupBookingsPanel } from "@/components/wedding/setup-bookings";
import { BOOKING_CATEGORIES, categoryBookingState } from "@/lib/domain/booking-state";
import { fixture } from "./actions";
import "@/app/globals.css";
import "@/app/product.css";
function Fixture() {
  const view = new URLSearchParams(window.location.search).get("view");
  const [, render] = useState(0);
  useEffect(() => { const refresh = () => render(n => n + 1); window.addEventListener("fixture-refresh", refresh); return () => window.removeEventListener("fixture-refresh", refresh); }, []);
  const data = { complete: true, relationships: fixture.relationships, legacyVenueName: null,
    taxonomy: [{ id: "photo", slug: "wedding-photographers", name: "Wedding Photographers", category: "photography-content", categoryId: "parent" }],
    categories: BOOKING_CATEGORIES.map(c => categoryBookingState(c.key, { relationships: fixture.relationships, declarations: fixture.declarations, complete: true })) };
  const content = <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
    {view === "details" ? <><p className="eyebrow">Our Wedding</p><h1 className="font-display text-4xl">Wedding Details</h1><p className="mt-3 text-sm text-ink-soft">Keep the details you know in one place. Anything undecided can stay open until you are ready.</p></> : <h1>Isolated Setup fixture — no database</h1>}
    {view !== "details" ? <>
    <button type="button" onClick={() => { fixture.skipFailure = true; }}>Simulate skip failure</button>
    <output aria-label="Booking creates">{fixture.creates}</output>
    <output aria-label="Selected vendor ID">{fixture.selectedId}</output>
    <output aria-label="Booking price">{fixture.price}</output>
    <SetupWizard values={{ revision: fixture.revision }} />
    <SetupBookingsPanel data={data} />
    </> : null}
    <WeddingDetailsForm partnerOneName="One" partnerTwoName="Two" values={{ revision: fixture.revision }} />
    {view === "details" ? <SetupBookingsPanel data={data} /> : null}
  </main>;
  return new URLSearchParams(location.search).has("shell") ? <AppShell role="couple" displayName="Alex & Sam">{content}</AppShell> : content;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
