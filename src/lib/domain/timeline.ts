import type { TaskStatus } from "./tasks";

export type TimelineTask = {
  id: string;
  title: string;
  dueDate: string | null;
  status: TaskStatus;
};

export type TimelineGroup = {
  key: string;
  label: string;
  tasks: TimelineTask[];
};

function utcDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

export function relativeTimelineLabel(dueDate: string, weddingDate: string): { key: string; label: string } {
  const due = utcDate(dueDate);
  const wedding = utcDate(weddingDate);
  const daysBefore = Math.round((wedding.getTime() - due.getTime()) / 86_400_000);

  if (daysBefore < 0) return { key: "after", label: "After the Wedding" };
  if (daysBefore <= 7) return { key: "week", label: "Wedding Week" };
  if (daysBefore < 28) {
    const weeks = Math.max(2, Math.round(daysBefore / 7));
    return { key: `week-${weeks}`, label: `${weeks} Weeks Before` };
  }

  const calendarMonths =
    (wedding.getUTCFullYear() - due.getUTCFullYear()) * 12 +
    wedding.getUTCMonth() -
    due.getUTCMonth();
  const completeMonths = Math.max(
    1,
    calendarMonths - (wedding.getUTCDate() < due.getUTCDate() ? 1 : 0),
  );
  return {
    key: `month-${completeMonths}`,
    label: completeMonths === 1 ? "1 Month Before" : `${completeMonths} Months Before`,
  };
}

function absoluteLabel(dueDate: string): { key: string; label: string } {
  const date = utcDate(dueDate);
  return {
    key: dueDate.slice(0, 7),
    label: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(date),
  };
}

export function buildTimeline(
  tasks: TimelineTask[],
  weddingDate: string | null,
): TimelineGroup[] {
  const datedTasks = tasks
    .filter((task): task is TimelineTask & { dueDate: string } => Boolean(task.dueDate))
    .toSorted((left, right) => left.dueDate.localeCompare(right.dueDate));

  const groups = new Map<string, TimelineGroup>();
  for (const task of datedTasks) {
    const descriptor = weddingDate
      ? relativeTimelineLabel(task.dueDate, weddingDate)
      : absoluteLabel(task.dueDate);
    const existing = groups.get(descriptor.key);
    if (existing) existing.tasks.push(task);
    else groups.set(descriptor.key, { ...descriptor, tasks: [task] });
  }

  return [...groups.values()];
}
