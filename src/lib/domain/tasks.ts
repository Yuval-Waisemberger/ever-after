import { calendarDayDifference, deadlineLabel } from "./date-status";

export type TaskStatus = "open" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export type TaskSummary = {
  total: number;
  completed: number;
  open: number;
  dueThisWeek: number;
  completion: number;
};

export function calculateTaskCompletionPercentage(
  tasks: Array<{ status: TaskStatus }>,
): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((task) => task.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

export function calculateTaskSummary(
  tasks: Array<{ status: TaskStatus; dueDate: string | null }>,
  today = new Date(),
): TaskSummary {
  const completed = tasks.filter((task) => task.status === "completed").length;
  return {
    total: tasks.length,
    completed,
    open: tasks.length - completed,
    dueThisWeek: tasks.filter(
      (task) => task.status !== "completed" && isDueWithinDays(task.dueDate, today, 7),
    ).length,
    completion: calculateTaskCompletionPercentage(tasks),
  };
}

export function taskDisplayStatus(
  task: { status: TaskStatus; dueDate: string | null },
  today = new Date(),
): { kind: "completed" | "overdue" | "due_soon" | "in_progress" | "not_started"; label: string } {
  if (task.status === "completed") return { kind: "completed", label: "Completed" };
  if (task.dueDate) {
    const deadline = deadlineLabel(task.dueDate, today);
    if (deadline.kind === "overdue") return { kind: "overdue", label: deadline.label };
    if (deadline.kind === "due_soon") return { kind: "due_soon", label: deadline.label };
  }
  if (task.status === "in_progress") return { kind: "in_progress", label: "In progress" };
  return { kind: "not_started", label: "Not started" };
}

export function selectUpcomingTasks<T extends {
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
}>(tasks: T[], today = new Date(), limit = 5): T[] {
  const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter((task) => {
      if (task.status === "completed" || !task.dueDate) return false;
      return calendarDayDifference(task.dueDate, today) <= 7;
    })
    .toSorted((left, right) => {
      const leftDays = calendarDayDifference(left.dueDate!, today);
      const rightDays = calendarDayDifference(right.dueDate!, today);
      const leftOverdue = leftDays < 0;
      const rightOverdue = rightDays < 0;
      if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
      if (leftOverdue && priorityRank[left.priority] !== priorityRank[right.priority]) {
        return priorityRank[left.priority] - priorityRank[right.priority];
      }
      return leftDays - rightDays || priorityRank[left.priority] - priorityRank[right.priority];
    })
    .slice(0, limit);
}

function startOfUtcDate(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isDueWithinDays(
  dueDate: string | null,
  today: Date,
  days: number,
): boolean {
  if (!dueDate) return false;
  const start = startOfUtcDate(today);
  const due = startOfUtcDate(dueDate);
  const difference = Math.round((due.getTime() - start.getTime()) / 86_400_000);
  return difference >= 0 && difference <= days;
}
