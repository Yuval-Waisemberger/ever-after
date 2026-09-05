import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { changeTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { TaskForm } from "./task-form";
import { TaskStatusPill } from "./task-status-pill";
import { formatCalendarDate } from "@/lib/domain/date-status";

type TaskRowProps = {
  task: {
    id: string;
    title: string;
    notes: string | null;
    category: string | null;
    due_date: string | null;
    priority: "low" | "medium" | "high";
    status: "open" | "in_progress" | "completed";
  };
};

export function TaskRow({ task, defaultOpen = false }: TaskRowProps & { defaultOpen?: boolean }) {
  return (
    <article data-status={task.status} data-priority={task.priority} className="task-row rounded-2xl border bg-paper px-4 py-4 sm:px-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`font-semibold ${task.status === "completed" ? "text-ink-soft line-through" : "text-ink"}`}>{task.title}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide ${task.priority === "high" ? "bg-red-900/8 text-red-800" : task.priority === "low" ? "bg-sage/10 text-sage" : "bg-gold/12 text-[#77571f]"}`}>{task.priority}</span>
            <TaskStatusPill status={task.status} dueDate={task.due_date} />
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {[task.category, task.due_date ? formatCalendarDate(task.due_date) : "No due date"].filter(Boolean).join(" · ")}
          </p>
          {task.notes ? <p className="mt-3 text-sm leading-6 text-ink-soft">{task.notes}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <form action={changeTaskStatus}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="status" value={task.status === "completed" ? "open" : "completed"} />
            <button className="grid size-10 place-items-center rounded-full border bg-paper text-sage hover:border-sage" aria-label={task.status === "completed" ? `Reopen ${task.title}` : `Complete ${task.title}`}>
              {task.status === "completed" ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
            </button>
          </form>
          <form action={deleteTask}>
            <input type="hidden" name="id" value={task.id} />
            <button className="grid size-10 place-items-center rounded-full border bg-paper text-red-700 hover:border-red-700" aria-label={`Delete ${task.title}`}>
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </div>
      <details className="mt-4 border-t pt-3" open={defaultOpen}>
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-wine">
          <Pencil className="size-3.5" /> Edit task
        </summary>
        <div className="mt-4">
          <TaskForm
            key={[task.title, task.notes, task.category, task.due_date, task.priority, task.status].join("|")}
            initial={{ id: task.id, title: task.title, notes: task.notes, category: task.category, dueDate: task.due_date, priority: task.priority, status: task.status }}
          />
        </div>
      </details>
    </article>
  );
}
