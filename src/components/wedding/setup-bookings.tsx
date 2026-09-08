"use client";
import { useState } from "react";
import "./setup-visual.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BOOKING_CATEGORIES, type BookingCategory } from "@/lib/domain/booking-state";
import type { SetupBookings } from "@/lib/queries/setup-bookings";
import { VendorTypeahead } from "./vendor-typeahead";
import { bookSetupVendor, saveBookingDeclaration, type BookingResult } from "@/lib/actions/setup-bookings";

const labels = { CONFIRMED_BOOKED: "Booked", REPORTED_ARRANGED_DETAILS_LATER: "Already arranged — vendor details not added yet", NOT_RECORDED_AS_BOOKED: "No booking added", UNKNOWN_NEEDS_REVIEW: "Review booking details" };
export function SetupBookingsPanel({ data }: { data: SetupBookings }) {
  return <section className="setup-bookings-panel mt-6 rounded-2xl border bg-paper p-5 sm:p-7" aria-label="Arranged vendors">
    <h2 className="font-display text-2xl">Who have you already arranged?</h2>
    <p className="mt-2 text-sm text-ink-soft">Optional — add vendors now or come back later.</p>
    {!data.complete ? <p role="alert">We couldn’t load all your bookings. Please refresh before making changes.</p> : null}
    {data.legacyVenueName ? <p className="mt-3 text-sm text-ink-soft">Previous venue: <bdi>{data.legacyVenueName}</bdi></p> : null}
    <div className="mt-4 space-y-3">{BOOKING_CATEGORIES.map(c => <CategoryBooking key={c.key} category={c.key} data={data} />)}</div>
  </section>;
}
function CategoryBooking({ category, data }: { category: BookingCategory; data: SetupBookings }) {
  const router = useRouter();
  const mapping = BOOKING_CATEGORIES.find(c => c.key === category)!;
  const current = data.categories.find(c => c.category === category)!;
  const [mode, setMode] = useState<"marketplace" | "external" | null>(null);
  const [pending, setPending] = useState(false), [locked, setLocked] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [subcategory, setSubcategory] = useState<string>(mapping.subcategories[0] ?? "");
  const [selected, setSelected] = useState(""), [name, setName] = useState(""), [price, setPrice] = useState("");
  const types = data.taxonomy.filter(t => category === "other" || mapping.subcategories.some(s => s === t.slug));
  async function declaration(operation: "add" | "remove" | "looking" | "not_yet") {
    setPending(true);
    try { const reply = await saveBookingDeclaration({ category, operation }); setResult(reply); if (reply.status !== "error") router.refresh(); }
    catch { setResult({ status: "error", message: "Your update couldn’t be confirmed. Refresh to check your details." }); }
    finally { setPending(false); }
  }
  async function book() {
    if (!mode) return;
    setPending(true);
    try {
      const reply = await bookSetupVendor({ category, mode, subcategory, ...(mode === "marketplace" ? { vendorId: selected } : { businessName: name }), ...(price === "" ? {} : { agreedPriceShekels: Number(price) }) });
      setResult(reply);
      // Never replay a successful booking or an uncertain External Vendor creation.
      if (reply.status !== "error" || reply.creationAttempted) setLocked(true);
      if (reply.status !== "error") router.refresh();
    } catch { setLocked(true); setResult({ status: "error", message: "The booking outcome is uncertain. Review Our Vendors before making another booking." }); }
    finally { setPending(false); }
  }
  return <details className="rounded-xl border p-4">
    <summary className="cursor-pointer font-semibold"><span>{mapping.label}</span><span className="mt-1 block text-xs font-normal text-ink-soft">{labels[current.state]}</span></summary>
    {current.confirmedIds.map(id => <p className="mt-3" key={id}>Booked: <bdi>{data.relationships.find(r => r.id === id)?.businessName}</bdi> · <Link className="text-wine underline" href="/vendors/my">Edit in Our Vendors</Link></p>)}
    {current.needsReview ? <p role="status" className="mt-3 text-sm text-wine">Please check this category’s booking details in Our Vendors.</p> : null}
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={pending || locked || !data.complete} className="ea-button ea-button--secondary" onClick={() => { if (mode !== "marketplace") setSelected(""); setMode("marketplace"); }}>Search Ever After</button>
      <button type="button" disabled={pending || locked || !data.complete} className="ea-button ea-button--secondary" onClick={() => { if (mode !== "external") setSelected(""); setMode("external"); }}>Add external vendor</button>
      {!current.confirmedIds.length ? <button type="button" disabled={pending || !data.complete} className="ea-button ea-button--secondary" onClick={() => declaration("add")}>Add details later</button> : null}
      {current.declared ? <button type="button" disabled={pending} className="ea-button ea-button--secondary" onClick={() => declaration("remove")}>Clear “details later”</button> : null}
      {category === "venue" && !current.confirmedIds.length ? <><button type="button" disabled={pending || !data.complete} className="ea-button ea-button--secondary" onClick={() => declaration("looking")}>Venue: currently looking</button><button type="button" disabled={pending || !data.complete} className="ea-button ea-button--secondary" onClick={() => declaration("not_yet")}>Venue: not yet arranged</button></> : null}
    </div>
    {mode ? <div className="mt-4 grid gap-3">
      <label className="grid gap-1 text-sm">Service<select className="ea-input" value={subcategory} disabled={pending || locked} onChange={e => { setSubcategory(e.target.value); setSelected(""); }}><option value="">Choose a service</option>{types.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}</select></label>
      {!types.length ? <p role="alert">Service categories are unavailable. Please refresh.</p> : null}
      {mode === "marketplace" ? <VendorTypeahead key={subcategory} category={category} subcategory={subcategory} disabled={pending || locked} onSelect={setSelected} /> : <label className="grid gap-1 text-sm">Business name<input className="ea-input" maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>}
      <label className="grid gap-1 text-sm">Agreed price (₪), optional<input className="ea-input" type="number" min={0} step={1} value={price} onChange={e => setPrice(e.target.value)} /></label>
      <p className="text-xs text-ink-soft">Leave blank to keep an existing agreed price.</p>
      <button type="button" className="ea-button ea-button--primary justify-self-start" disabled={pending || locked || !subcategory || (mode === "marketplace" ? !selected : !name.trim())} onClick={book}>{pending ? "Saving…" : "Confirm booking"}</button>
    </div> : null}
    {result ? <p role={result.status === "error" ? "alert" : "status"} className="mt-4 text-sm">{result.message} <Link href="/vendors/my" className="text-wine underline">Review Our Vendors</Link>{result.status !== "error" ? <> · <Link href="/budget" className="text-wine underline">Open Budget</Link></> : null}</p> : null}
  </details>;
}
