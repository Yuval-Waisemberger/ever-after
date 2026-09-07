"use client";

import Link from "next/link";

import { useActionState } from "react";
import { saveBudgetItem, savePayment, setTotalBudget } from "@/lib/actions/budget";
import { initialActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { BUDGET_CATEGORIES } from "@/lib/validation/budget";

function Feedback({ state }: { state: typeof initialActionState }) {
  return state.message ? <p className={`rounded-xl px-3 py-2 text-sm ${state.status === "error" ? "bg-red-900/5 text-red-800" : "bg-green-900/5 text-green-900"}`} role="status">{state.message}</p> : null;
}

export function TotalBudgetForm({ totalMinor }: { totalMinor: number | null }) {
  const [state, action] = useActionState(setTotalBudget, initialActionState);
  return <form action={action} className="grid gap-3"><Feedback state={state} /><FormField name="totalBudgetShekels" type="number" min={0} label="Total wedding budget (₪)" defaultValue={totalMinor == null ? "" : totalMinor / 100} /><SubmitButton className="justify-self-start" pendingLabel="Saving…">Save total budget</SubmitButton></form>;
}

type BudgetItemInitial = {
  source?: "manual" | "booked_vendor";
  id?: string;
  coupleVendorId?: string | null;
  label?: string;
  category?: string | null;
  estimatedMinor?: number | null;
  committedMinor?: number | null;
  notes?: string | null;
};

export function BudgetItemForm({ initial = {} }: { initial?: BudgetItemInitial }) {
  const canonical = initial.source === "booked_vendor";
  const [state, action] = useActionState(saveBudgetItem, initialActionState);
  return (
    <form action={action} className="grid gap-4">
      <Feedback state={state} />
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="label" label="Expense" placeholder="Photographer" defaultValue={initial.label ?? ""} required />
        <label className="grid gap-2 text-sm font-semibold">Category (optional)<select name="category" defaultValue={initial.category ?? ""} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal"><option value="">No category</option>{initial.category && !BUDGET_CATEGORIES.includes(initial.category as typeof BUDGET_CATEGORIES[number]) ? <option value={initial.category}>{initial.category}</option> : null}{BUDGET_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
      </div>
      {canonical ? <p className="text-sm text-ink-soft">The committed amount is managed from <Link href="/vendors/my" className="font-semibold text-wine underline">vendor booking details</Link>. This expense stays linked when the booking is inactive.</p> : <p className="text-sm text-ink-soft">Manual expenses are independent. Manage vendor commitments in <Link href="/vendors/my" className="font-semibold text-wine underline">Our Vendors</Link>.</p>}
      <div className="grid gap-4 sm:grid-cols-2"><FormField name="estimatedShekels" type="number" min={0} label="Estimated (₪)" defaultValue={initial.estimatedMinor == null ? "" : initial.estimatedMinor / 100} />{!canonical ? <FormField name="committedShekels" type="number" min={0} label="Committed (₪)" defaultValue={initial.committedMinor == null ? "" : initial.committedMinor / 100} /> : null}</div>
      <label className="grid gap-2 text-sm font-semibold">Notes (optional)<textarea name="notes" rows={3} defaultValue={initial.notes ?? ""} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" /></label>
      <SubmitButton className="justify-self-start" pendingLabel={initial.id ? "Saving expense…" : "Adding expense…"}>{initial.id ? "Save expense" : "Add expense"}</SubmitButton>
    </form>
  );
}

type PaymentInitial = { id?: string; label?: string; amountMinor?: number; dueDate?: string | null; isPaid?: boolean; notes?: string | null };

export function PaymentForm({ budgetItemId, initial = {} }: { budgetItemId: string; initial?: PaymentInitial }) {
  const [state, action] = useActionState(savePayment, initialActionState);
  const fieldSuffix = initial.id ?? `${budgetItemId}-new`;
  return (
    <form action={action} className="grid gap-3 rounded-xl bg-paper-muted p-4">
      <input type="hidden" name="budgetItemId" value={budgetItemId} />
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <Feedback state={state} />
      <div className="grid gap-3 sm:grid-cols-3"><FormField id={`payment-name-${fieldSuffix}`} name="label" label="Payment name" placeholder="Deposit" hint="For example: Deposit, second payment, or final balance." defaultValue={initial.label ?? ""} required /><FormField id={`payment-amount-${fieldSuffix}`} name="amountShekels" type="number" min={1} label="Amount (₪)" defaultValue={initial.amountMinor == null ? "" : initial.amountMinor / 100} required /><FormField id={`payment-date-${fieldSuffix}`} name="dueDate" type="date" lang="en-GB" label="Due date" defaultValue={initial.dueDate ?? ""} /></div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isPaid" defaultChecked={initial.isPaid} className="accent-wine" />Already paid</label>
      <label className="grid gap-2 text-sm font-semibold">Notes (optional)<textarea name="notes" rows={2} defaultValue={initial.notes ?? ""} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" /></label>
      <SubmitButton className="justify-self-start" pendingLabel="Saving payment…">{initial.id ? "Save payment" : "Add payment"}</SubmitButton>
    </form>
  );
}
