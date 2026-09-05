import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { taskDisplayStatus, type TaskStatus } from "@/lib/domain/tasks";

const tones = {
  completed: "success",
  overdue: "danger",
  due_soon: "warning",
  in_progress: "progress",
  not_started: "neutral",
} satisfies Record<ReturnType<typeof taskDisplayStatus>["kind"], StatusTone>;

export function TaskStatusPill({ status, dueDate, today }: {
  status: TaskStatus;
  dueDate: string | null;
  today?: Date;
}) {
  const display = taskDisplayStatus({ status, dueDate }, today);
  return <StatusPill tone={tones[display.kind]}>{display.label}</StatusPill>;
}
