export type TaskStatus = "open" | "in_progress" | "completed";

export function calculateTaskCompletionPercentage(
  tasks: Array<{ status: TaskStatus }>,
): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((task) => task.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
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
