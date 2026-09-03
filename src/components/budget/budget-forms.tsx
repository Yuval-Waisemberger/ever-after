"use client";

import { useActionState } from "react";
import { saveBudgetItem, savePayment, setTotalBudget } from "@/lib/actions/budget";
import { initialActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

function Feedback({ state }: { state: typeof initialActionState }) {
  return state.message ? <p className={`rounded-xl px-3 py-2 text-sm ${state.status === "error" ? "bg-red-900/5 text-red-800" : "bg-green-900/5 text-green-900"}`} role="status">{state.message}</p> : null;
}

export function TotalBudgetForm({ totalMinor }: { totalMinor: number | null }) {
  const [state, action] = useActionState(setTotalBudget, initialActionState);
  return <form action={action} className="grid gap-3"><Feedback state={state} /><FormField name="totalBudgetShekels" type="number" min={0} label="Total wedding budget (₪)" defaultValue={totalMinor == null ? "" : totalMinor / 100} /><SubmitButton className="justify-self-start" pendingLabel="Saving…">Save total budget</SubmitButton></form>;
}

type BookedRelationship = {
  id: string;
  agreed_price_minor: number | string | null;
  vendor_profiles: { business_name: string } | Array<{ business_name: string }> | null;
};

export function BudgetItemForm({ booked }: { booked: BookedRelationship[] }) {
  const [state, action] = useActionState(saveBudgetItem, initialActionState);
  return (
    <form action={action} className="grid gap-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="label" label="Expense" placeholder="Photographer" required />
        <FormField name="category" label="Category (optional)" placeholder="Photography" />
      </div>
      <label className="grid gap-2 text-sm font-semibold">Booked vendor (optional)<select name="coupleVendorId" className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal"><option value="">No linked vendor</option>{booked.map((relationship) => { const vendor = Array.isArray(relationship.vendor_profiles) ? relationship.vendor_profiles[0] : relationship.vendor_profiles; return <option key={relationship.id} value={relationship.id}>{vendor?.business_name ?? "Booked vendor"}</option>; })}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><FormField name="estimatedShekels" type="number" min={0} label="Estimated (₪)" /><FormField name="committedShekels" type="number" min={0} label="Committed (₪)" /></div>
      <input type="hidden" name="notes" value="" />
      <SubmitButton className="justify-self-start" pendingLabel="Adding expense…">Add expense</SubmitButton>
    </form>
  );
}

export function PaymentForm({ budgetItemId }: { budgetItemId: string }) {
  const [state, action] = useActionState(savePayment, initialActionState);
  return (
    <form action={action} className="grid gap-3 rounded-xl bg-paper-muted p-4">
      <input type="hidden" name="budgetItemId" value={budgetItemId} />
      <input type="hidden" name="notes" value="" />
      <Feedback state={state} />
      <div className="grid gap-3 sm:grid-cols-3"><FormField name="label" label="Payment" placeholder="Deposit" required /><FormField name="amountShekels" type="number" min={1} label="Amount (₪)" required /><FormField name="dueDate" type="date" label="Due date" /></div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isPaid" className="accent-wine" />Already paid</label>
      <SubmitButton className="justify-self-start" pendingLabel="Saving payment…">Add payment</SubmitButton>
    </form>
  );
}
