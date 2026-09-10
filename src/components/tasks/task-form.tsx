"use client";

import { useActionState, useState, useId } from "react";
import { saveTask } from "@/lib/actions/tasks";
import { initialActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TASK_CATEGORIES } from "@/lib/validation/task";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/domain/task-status";
import { isPastCalendarDate } from "@/lib/domain/date-status";

export type TaskFormValues = {
  id?: string;
  title?: string;
  notes?: string | null;
  category?: string | null;
  dueDate?: string | null;
  priority?: "low" | "medium" | "high";
  status?: TaskStatus;
};

export function TaskForm({ initial = {} }: { initial?: TaskFormValues }) {
  const formId = useId();
  const [state, action] = useActionState(saveTask, initialActionState);
  const [draft, setDraft] = useState({ title: initial.title ?? "", notes: initial.notes ?? "", category: initial.category?.trim() || "Other", dueDate: initial.dueDate ?? "", priority: initial.priority ?? "medium", status: initial.status ?? "open" });
  const field = (name: keyof typeof draft) => ({ value: draft[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDraft(current => ({ ...current, [name]: event.target.value })) });
  const dueDate = draft.dueDate;
  const error = (name: string) => state.errors?.[name]?.[0];

  return (
    <form action={action} className="grid gap-4">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state.message ? (
        <p className={`rounded-xl px-3 py-2 text-sm ${state.status === "error" ? "bg-red-900/5 text-red-800" : "bg-green-900/5 text-green-900"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <FormField id={`${formId}-title`} name="title" label="Task" {...field("title")} error={error("title")} placeholder="Call the DJ" required />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold">Category (optional)<select name="category" aria-invalid={Boolean(error("category"))} aria-describedby={error("category") ? `${formId}-category-error` : undefined} {...field("category")} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">{initial.category && !TASK_CATEGORIES.includes(initial.category as typeof TASK_CATEGORIES[number]) ? <option value={initial.category}>{initial.category}</option> : null}{TASK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select>{error("category") ? <span id={`${formId}-category-error`} className="ea-field-error text-xs font-normal" role="alert">{error("category")}</span> : null}</label>
        <div>
          <FormField id={`${formId}-date`} name="dueDate" type="date" label="Due date (optional)" {...field("dueDate")} error={error("dueDate")} />
          {isPastCalendarDate(dueDate) ? <p className="mt-2 text-xs font-medium text-[#9A611C]" role="status">This due date is in the past.</p> : null}
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          Priority
          <select name="priority" aria-invalid={Boolean(error("priority"))} aria-describedby={error("priority") ? `${formId}-priority-error` : undefined} {...field("priority")} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {error("priority") ? <span id={`${formId}-priority-error`} role="alert" className="ea-field-error text-xs">{error("priority")}</span> : null}
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        Notes (optional)
        <textarea name="notes" aria-invalid={Boolean(error("notes"))} aria-describedby={error("notes") ? `${formId}-notes-error` : undefined} {...field("notes")} rows={3} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" />
        {error("notes") ? <span id={`${formId}-notes-error`} role="alert" className="ea-field-error text-xs">{error("notes")}</span> : null}
      </label>
      <label className="grid max-w-xs gap-2 text-sm font-semibold">Status<select name="status" aria-invalid={Boolean(error("status"))} aria-describedby={error("status") ? `${formId}-status-error` : undefined} {...field("status")} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">{TASK_STATUSES.map(status => <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>)}</select>{error("status") ? <span id={`${formId}-status-error`} role="alert" className="ea-field-error text-xs">{error("status")}</span> : null}</label>
      <SubmitButton className="justify-self-start" pendingLabel="Saving task…">
        {initial.id ? "Save changes" : "Add task"}
      </SubmitButton>
    </form>
  );
}
