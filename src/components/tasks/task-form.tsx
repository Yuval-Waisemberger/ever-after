"use client";

import { useActionState, useState } from "react";
import { saveTask } from "@/lib/actions/tasks";
import { initialActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TASK_CATEGORIES } from "@/lib/validation/task";
import { isPastCalendarDate } from "@/lib/domain/date-status";

export type TaskFormValues = {
  id?: string;
  title?: string;
  notes?: string | null;
  category?: string | null;
  dueDate?: string | null;
  priority?: "low" | "medium" | "high";
  status?: "open" | "in_progress" | "completed";
};

export function TaskForm({ initial = {} }: { initial?: TaskFormValues }) {
  const [state, action] = useActionState(saveTask, initialActionState);
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const error = (name: string) => state.errors?.[name]?.[0];

  return (
    <form action={action} className="grid gap-4">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state.message ? (
        <p className={`rounded-xl px-3 py-2 text-sm ${state.status === "error" ? "bg-red-900/5 text-red-800" : "bg-green-900/5 text-green-900"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <FormField name="title" label="Task" defaultValue={initial.title} error={error("title")} placeholder="Call the DJ" required />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold">Category (optional)<select name="category" defaultValue={initial.category ?? ""} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal"><option value="">No category</option>{initial.category && !TASK_CATEGORIES.includes(initial.category as typeof TASK_CATEGORIES[number]) ? <option value={initial.category}>{initial.category}</option> : null}{TASK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select>{error("category") ? <span className="ea-field-error text-xs font-normal" role="alert">{error("category")}</span> : null}</label>
        <div>
          <FormField name="dueDate" type="date" label="Due date (optional)" value={dueDate} onChange={(event) => setDueDate(event.target.value)} error={error("dueDate")} />
          {isPastCalendarDate(dueDate) ? <p className="mt-2 text-xs font-medium text-[#9A611C]" role="status">This due date is in the past.</p> : null}
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          Priority
          <select name="priority" defaultValue={initial.priority ?? "medium"} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        Notes (optional)
        <textarea name="notes" defaultValue={initial.notes ?? ""} rows={3} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" />
      </label>
      <label className="grid max-w-xs gap-2 text-sm font-semibold">Status<select name="status" defaultValue={initial.status ?? "open"} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal"><option value="open">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>
      <SubmitButton className="justify-self-start" pendingLabel="Saving task…">
        {initial.id ? "Save changes" : "Add task"}
      </SubmitButton>
    </form>
  );
}
