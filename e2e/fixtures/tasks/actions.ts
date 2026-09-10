import { taskSchema } from "@/lib/validation/task";
import type { TaskStatus } from "@/lib/domain/task-status";
import type { ActionState } from "@/lib/actions/state";
export type FixtureTask = { id: string; assignee?: "partner_one" | "partner_two" | "other" | null; title: string; notes: string | null; category: string | null; due_date: string | null; priority: "high" | "medium" | "low"; status: TaskStatus };
export const fixture = { fail: false, tasks: [
  { id: "11111111-1111-4111-8111-111111111111", title: "Final song list and arrival confirmation with the wedding venue", notes: "Couple-only note", category: "Venue", due_date: "2026-09-05", priority: "high", status: "waiting_on_vendor" },
  { id: "22222222-2222-4222-8222-222222222222", title: "Undated contract response", notes: null, category: "Other", due_date: null, priority: "medium", status: "waiting_on_vendor" },
] as FixtureTask[] };
const notify = () => window.dispatchEvent(new Event("fixture-refresh"));
const failed = (): ActionState => ({ status: "error", message: "The task could not be changed. Refresh and try again." });
export async function getTasks() { return fixture.tasks; }
export async function getOwnedWedding() { return { partner_one_name: "Fixture One", partner_two_name: "Fixture Two", wedding_date: "2026-09-12" }; }
export async function saveTask(_state: ActionState, form: FormData): Promise<ActionState> {
  const p = taskSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { status: "error", errors: p.error.flatten().fieldErrors, message: "Please check the task fields below." };
  if (fixture.fail) return failed();
  const task = { assignee: p.data.assignee ?? (p.data.id ? fixture.tasks.find(t => t.id === p.data.id)?.assignee : "other"), id: p.data.id || crypto.randomUUID(), title: p.data.title, notes: p.data.notes, category: p.data.category, due_date: p.data.dueDate, priority: p.data.priority, status: p.data.status };
  fixture.tasks = [...fixture.tasks.filter(t => t.id !== task.id), task]; notify(); return { status: "success", message: "Task saved." };
}
export async function changeTaskStatus(_state: ActionState, form: FormData): Promise<ActionState> {
  if (fixture.fail) return failed();
  fixture.tasks = fixture.tasks.map(t => t.id === form.get("id") ? { ...t, status: form.get("status") as TaskStatus } : t); notify(); return { status: "success" };
}
export async function deleteTask(_state: ActionState, form: FormData): Promise<ActionState> {
  if (fixture.fail) return failed(); fixture.tasks = fixture.tasks.filter(t => t.id !== form.get("id")); notify(); return { status: "success" };
}
