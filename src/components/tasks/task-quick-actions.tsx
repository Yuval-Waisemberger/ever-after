"use client";
import { useActionState } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { changeTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { initialActionState } from "@/lib/actions/state";
import type { TaskStatus } from "@/lib/domain/task-status";
export function TaskQuickActions({ id, title, status }: { id: string; title: string; status: TaskStatus }) {
  const [change, changeAction, changing] = useActionState(changeTaskStatus, initialActionState);
  const [remove, deleteAction, deleting] = useActionState(deleteTask, initialActionState);
  const pending = changing || deleting;
  return <div className="max-w-xs shrink-0">
    <div className="flex items-center gap-2">
      <form action={changeAction}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status === "completed" ? "open" : "completed"} />
        <button disabled={pending} className="grid size-11 place-items-center rounded-full border bg-paper text-sage hover:border-sage disabled:opacity-50" aria-label={`${status === "completed" ? "Reopen" : "Complete"} ${title}`}>
          {status === "completed" ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
        </button>
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="id" value={id} />
        <button disabled={pending} className="grid size-11 place-items-center rounded-full border bg-paper text-red-700 hover:border-red-700 disabled:opacity-50" aria-label={`Delete ${title}`}><Trash2 className="size-4" /></button>
      </form>
    </div>
    {[change, remove].filter(result => result.status === "error").map((result, index) => <p key={index} role="alert" className="mt-2 text-sm text-red-800">{result.message}</p>)}
  </div>;
}
