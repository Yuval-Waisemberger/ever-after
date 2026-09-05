import type { Metadata } from "next";
import { Check, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BudgetItemForm, PaymentForm, TotalBudgetForm } from "@/components/budget/budget-forms";
import { deleteBudgetItem, deletePayment, togglePaymentPaid } from "@/lib/actions/budget";
import { formatIls } from "@/lib/domain/budget";
import { getBudgetPageData } from "@/lib/queries/budget";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage() {
  const { wedding, items, booked, summary } = await getBudgetPageData();
  const metrics = [
    ["Total budget", summary.totalBudgetMinor, "Your overall spending limit"],
    ["Estimated", summary.projectedMinor, "Current expected cost"],
    ["Committed", summary.committedMinor, "Prices you have agreed to pay"],
    ["Paid", summary.paidMinor, "Money already paid"],
    ["Available", summary.availableMinor, "Budget not yet committed"],
  ] as const;
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="One financial picture" title="Budget & Payments" description="See what you expect to spend, what you have committed to, and what has actually been paid." />
      <section className="budget-metrics mt-8 grid sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value, description]) => <div key={label} className="rounded-2xl border bg-paper p-4"><p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</p><p className={`font-display mt-2 text-2xl ${label === "Available" && value != null && value < 0 ? "text-red-700" : "text-wine"}`}>{formatIls(value)}</p><p className="mt-2 text-xs leading-5 text-ink-soft">{description}</p></div>)}</section>
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-paper p-5 sm:p-6"><h2 className="font-display text-2xl">Total budget</h2><div className="mt-4"><TotalBudgetForm totalMinor={wedding.total_budget_minor == null ? null : Number(wedding.total_budget_minor)} /></div></section>
        <section className="rounded-2xl border bg-paper p-5 sm:p-6"><h2 className="font-display text-2xl">Add an expense</h2><p className="mt-2 text-sm text-ink-soft">Track vendor costs and every other wedding expense. A booked vendor with an agreed price is added here automatically.</p><div className="mt-4"><BudgetItemForm booked={booked} /></div></section>
      </div>
      <section className="budget-expenses mt-8">
        <div className="flex items-end justify-between"><div><p className="eyebrow">All expenses</p><h2 className="font-display mt-1 text-3xl">Commitments and payments</h2></div><p className="text-sm text-ink-soft">{formatIls(summary.remainingCommittedMinor)} committed but not yet paid</p></div>
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border bg-paper p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-display text-2xl">{item.label}</h3><p className="mt-1 text-xs text-ink-soft">{item.category || "Uncategorized"}</p></div><div className="text-right text-sm"><p>Estimated <strong>{formatIls(item.estimated_amount_minor)}</strong></p><p className="mt-1">Committed <strong>{formatIls(item.committed_amount_minor)}</strong></p></div></div>
              <div className="mt-5 space-y-2">{item.payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-3 text-sm"><span className={`grid size-7 place-items-center rounded-full ${payment.is_paid ? "bg-sage/12 text-sage" : "bg-gold/12 text-gold"}`}><Check className="size-3.5" /></span><span className="font-semibold">{payment.label}</span><span>{formatIls(payment.amount_minor)}</span><span className="text-ink-soft">{payment.is_paid ? "Paid" : payment.due_date ? `Due ${payment.due_date}` : "No due date"}</span><div className="ml-auto flex gap-1"><form action={togglePaymentPaid}><input type="hidden" name="id" value={payment.id} /><input type="hidden" name="paid" value={payment.is_paid ? "false" : "true"} /><button className="rounded-lg px-2 py-1 text-xs font-semibold text-wine">Mark {payment.is_paid ? "unpaid" : "paid"}</button></form><form action={deletePayment}><input type="hidden" name="id" value={payment.id} /><button className="grid size-8 place-items-center text-red-700" aria-label={`Delete ${payment.label}`}><Trash2 className="size-3.5" /></button></form></div></div>)}</div>
              <details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-semibold text-wine">Edit expense</summary><div className="mt-4"><BudgetItemForm booked={booked} initial={{ id: item.id, coupleVendorId: item.couple_vendor_id, label: item.label, category: item.category, estimatedMinor: item.estimated_amount_minor, committedMinor: item.committed_amount_minor, notes: item.notes }} /></div></details>
              {item.payments.map((payment) => <details key={`edit-${payment.id}`} className="mt-3 border-t pt-3"><summary className="cursor-pointer text-xs font-semibold text-wine">Edit {payment.label}</summary><div className="mt-3"><PaymentForm budgetItemId={item.id} initial={{ id: payment.id, label: payment.label, amountMinor: payment.amount_minor, dueDate: payment.due_date, isPaid: payment.is_paid, notes: payment.notes }} /></div></details>)}
              <details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-semibold text-wine">Add a payment</summary><div className="mt-4"><PaymentForm budgetItemId={item.id} /></div></details>
              <form action={deleteBudgetItem} className="mt-4"><input type="hidden" name="id" value={item.id} /><button className="text-xs font-semibold text-red-700 hover:underline">Delete expense and its payments</button></form>
            </article>
          ))}
          {!items.length ? <div className="rounded-2xl border border-dashed bg-paper/60 p-8 text-center"><h3 className="font-display text-2xl">No expenses yet</h3><p className="mt-2 text-sm text-ink-soft">Add an estimated cost, a firm commitment, or a non-vendor expense above.</p></div> : null}
        </div>
      </section>
    </main>
  );
}
