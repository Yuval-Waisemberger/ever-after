"use client";

import { useActionState } from "react";
import { saveTask } from "@/lib/actions/tasks";
import { initialActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

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
        <FormField name="category" label="Category (optional)" defaultValue={initial.category ?? ""} error={error("category")} placeholder="Vendors" />
        <FormField name="dueDate" type="date" label="Due date (optional)" defaultValue={initial.dueDate ?? ""} error={error("dueDate")} />
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
      <input type="hidden" name="status" value={initial.status ?? "open"} />
      <SubmitButton className="justify-self-start" pendingLabel="Saving task…">
        {initial.id ? "Save changes" : "Add task"}
      </SubmitButton>
    </form>
  );
}
