import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { getTasks } from "@/lib/queries/tasks";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const tasks = await getTasks();
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Plan at your pace" title="Tasks" description="Create the list that fits your wedding. Dated tasks also appear in Wedding Timeline." />
      <section className="paper-panel mt-8 p-5 sm:p-7">
        <h2 className="font-display text-2xl">Add a task</h2>
        <div className="mt-5"><TaskForm /></div>
      </section>
      <div className="mt-8 space-y-3">
        {tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyState title="No tasks yet" description="Add anything you want to remember. Setup and AI are not required." />}
      </div>
    </main>
  );
}
