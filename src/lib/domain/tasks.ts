import { calendarDayDifference, deadlineLabel } from "./date-status";

import { TASK_STATUS_LABELS, type TaskStatus } from "./task-status";
export { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "./task-status";
export type TaskPriority = "low" | "medium" | "high";

export function taskCategory(category: string | null | undefined): string {
  return category?.trim() || "Other";
}

export function compareTaskPriorityDate(a: { id: string; priority?: string | null; due_date?: string | null }, b: { id: string; priority?: string | null; due_date?: string | null }): number {
  const rank = (value?: string | null) => {
    const index = ["high", "medium", "low"].indexOf(value?.trim().toLowerCase() ?? "");
    return index < 0 ? 3 : index;
  };
  const dateKey = (value?: string | null) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "9999-99-99";
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : "9999-99-99";
  };
  const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
  return rank(a.priority) - rank(b.priority) || compare(dateKey(a.due_date), dateKey(b.due_date)) || compare(a.id, b.id);
}

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
) {
  return {
    workflow: { kind: task.status, label: TASK_STATUS_LABELS[task.status] },
    deadline: task.status !== "completed" && task.dueDate ? deadlineLabel(task.dueDate, today) : null,
  };
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

export function isDueWithinDays(dueDate: string | null, today: Date, days: number): boolean {
  if (!dueDate) return false;
  const difference = calendarDayDifference(dueDate, today);
  return difference >= 0 && difference <= days;
}

export function filterTasks<T extends { status: TaskStatus; category: string | null }>(tasks: T[], status: TaskStatus | "all" | "incomplete" = "all", category = ""): T[] {
  return tasks.filter(task => (!category || taskCategory(task.category) === taskCategory(category)) &&
    (status === "all" || (status === "incomplete" ? task.status !== "completed" : task.status === status)));
}
