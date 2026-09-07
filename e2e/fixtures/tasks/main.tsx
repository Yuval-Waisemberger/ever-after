import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskFilters } from "@/components/tasks/task-filters";
import { filterTasks, TASK_STATUSES, calculateTaskSummary } from "@/lib/domain/tasks";
import TimelinePage from "@/app/(couple)/wedding/timeline/page";
import { fixture } from "./actions";
import "@/app/globals.css";
import "@/app/product.css";
function Fixture() {
  const [revision, render] = useState(0), [timeline, setTimeline] = useState<ReactNode>(null);
  useEffect(() => { const update = () => render(n => n + 1); window.addEventListener("fixture-refresh", update); return () => window.removeEventListener("fixture-refresh", update); }, []);
  useEffect(() => { void TimelinePage().then(setTimeline); }, [revision]);
  const params = new URLSearchParams(location.search), category = params.get("category") ?? "";
  const status = TASK_STATUSES.find(s => s === params.get("status")) ?? "all";
  const summary = calculateTaskSummary(fixture.tasks.map(t => ({ ...t, dueDate: t.due_date })), new Date());
  return <main className="mx-auto max-w-6xl px-5 py-8">
    <h1 className="font-display text-4xl">Our Tasks</h1>
    <p>Open: {summary.open} · Due this week: {summary.dueThisWeek} · Completed: {summary.completed}</p>
    <button onClick={() => { fixture.fail = !fixture.fail; }}>Toggle simulated failure</button>
    <TaskFilters category={category} status={status} />
    <section aria-label="Add task" className="paper-panel my-6 p-5"><TaskForm /></section>
    <section aria-label="Task list" className="space-y-3">{filterTasks(fixture.tasks, status, category).map(task => <TaskRow key={task.id} task={task} />)}</section>
    <section aria-label="Timeline">{timeline}</section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
