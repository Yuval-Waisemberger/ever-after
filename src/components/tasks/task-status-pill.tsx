import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { taskDisplayStatus, type TaskStatus } from "@/lib/domain/tasks";
const tones: Record<TaskStatus, StatusTone> = { open: "neutral", in_progress: "progress", waiting_on_vendor: "warning", completed: "success" };
export function TaskStatusPill({ status, dueDate, today }: { status: TaskStatus; dueDate: string | null; today?: Date }) {
  const { workflow, deadline } = taskDisplayStatus({ status, dueDate }, today);
  return <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
    <StatusPill tone={tones[status]}>{workflow.label}</StatusPill>
    {deadline && deadline.kind !== "future" ? <StatusPill tone={deadline.kind === "overdue" ? "danger" : "warning"}>{deadline.label}</StatusPill> : null}
  </span>;
}
