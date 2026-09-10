import { AppShell } from "@/components/layout/app-shell";
import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskListPanel } from "@/components/tasks/task-list-panel";
import { filterTasks, TASK_STATUSES, calculateTaskSummary } from "@/lib/domain/tasks";
import TimelinePage from "@/app/(couple)/wedding/timeline/page";
import { fixture } from "./actions";
import "@/app/globals.css";
import "@/app/eligible-consistency.css";
import "@/app/product.css";
import "@/components/tasks/tasks-visual.css";
function Fixture() {
  const [revision, render] = useState(0), [timeline, setTimeline] = useState<ReactNode>(null);
  useEffect(() => { const update = () => render(n => n + 1); window.addEventListener("fixture-refresh", update); return () => window.removeEventListener("fixture-refresh", update); }, []);
  useEffect(() => { void TimelinePage().then(setTimeline); }, [revision]);
  const params = new URLSearchParams(location.search), category = params.get("category") ?? "";
  const status = TASK_STATUSES.find(s => s === params.get("status")) ?? "all";
  const summary = calculateTaskSummary(fixture.tasks.map(t => ({ ...t, dueDate: t.due_date })), new Date());
  const content = <main className="ea-consistent-page mx-auto max-w-6xl px-5 py-8">
    <h1 className="font-display text-4xl">Our Tasks</h1>
    <p>Open: {summary.open} · Due this week: {summary.dueThisWeek} · Completed: {summary.completed}</p>
    <button onClick={() => { fixture.fail = !fixture.fail; }}>Toggle simulated failure</button>
    <TaskListPanel count={filterTasks(fixture.tasks, status, category).length} filters={<TaskFilters category={category} status={status} />}>
      {filterTasks(fixture.tasks, status, category).map(task => <TaskRow key={task.id} task={task} />)}
    </TaskListPanel>
    <section aria-label="Add task" className="tasks-create-panel paper-panel my-6 p-5"><h2 className="mb-5 font-display text-2xl">Add a task</h2><TaskForm /></section>
    <section aria-label="Timeline">{timeline}</section>
  </main>;
  return params.has("shell") ? <AppShell role="couple" displayName="Alex & Sam">{content}</AppShell> : content;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
