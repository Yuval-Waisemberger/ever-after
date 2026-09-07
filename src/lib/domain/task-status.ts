export const TASK_STATUSES = ["open", "in_progress", "waiting_on_vendor", "completed"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Not started", in_progress: "In progress", waiting_on_vendor: "Waiting on vendor", completed: "Completed",
};
