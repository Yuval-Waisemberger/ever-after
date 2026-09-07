import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BudgetItemForm, PaymentForm } from "@/components/budget/budget-forms";
import { BudgetBookingNotice } from "@/components/budget/booking-notice";
import { calculateBudgetSummary, formatIls } from "@/lib/domain/budget";
import "@/app/globals.css";

function Fixture() {
  const [state, setState] = useState("booked");
  const item = { source: "booked_vendor" as const, relationshipStatus: state === "unbooked" ? "rejected" : "booked",
    estimatedAmountMinor: 150000, committedAmountMinor: state === "unbooked" ? null : state === "reduced" ? 10000 : 100000,
    payments: [{ label: "Paid deposit", amountMinor: 20000, isPaid: true }, { label: "Final installment", amountMinor: 80000, isPaid: false, dueDate: "2027-01-01" }] };
  const summary = calculateBudgetSummary(170000, [item]);
  return <main className="mx-auto max-w-3xl p-5">
    <h1 className="font-display text-3xl">Budget &amp; Payments</h1>
    <p>Isolated test fixture — no database connection.</p>
    <div className="my-5 flex flex-wrap gap-3">{[["booked", "Book / rebook"], ["unbooked", "Unbook"], ["reduced", "Reduce price"]].map(([value,label]) => <button className="ea-button ea-button--secondary" key={value} onClick={() => setState(value)}>{label}</button>)}</div>
    <p>Committed <output data-testid="committed">{formatIls(summary.committedMinor)}</output></p>
    <p>Paid <output data-testid="paid">{formatIls(summary.paidMinor)}</output></p>
    <p>Available <output data-testid="available">{formatIls(summary.availableMinor)}</output></p>
    <section aria-label="Upcoming payments">{summary.upcomingPayments.map(p => <p key={p.label}>{p.label}</p>)}</section>
    <BudgetBookingNotice item={item} vendorName="External Studio · סטודיו" />
    <section aria-label="Edit canonical expense" className="mt-5 rounded-xl border bg-paper p-4"><BudgetItemForm key={state} initial={{ id: "fixture", source: "booked_vendor", label: "External Studio", estimatedMinor: 150000, committedMinor: item.committedAmountMinor }} /></section>
    <section aria-label="Payment form" className="mt-5"><PaymentForm budgetItemId="fixture" /></section>
    <section aria-label="Manual expense" className="mt-5"><BudgetItemForm /></section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
