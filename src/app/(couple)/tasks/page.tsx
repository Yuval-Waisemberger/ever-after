import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { getTasks } from "@/lib/queries/tasks";
import { filterTasks, TASK_STATUSES } from "@/lib/domain/tasks";
import { TaskFilters } from "@/components/tasks/task-filters";

export const metadata: Metadata = { title: "Our Tasks" };

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const params = await searchParams;
  const selectedCategory = typeof params.category === "string" ? params.category : "";
  const editTaskId = typeof params.edit === "string" ? params.edit : "";
  const tasks = await getTasks();
  const selectedStatus = TASK_STATUSES.find(status => status === params.status) ?? "all";
  const visibleTasks = filterTasks(tasks, selectedStatus, selectedCategory);
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Plan together" title="Our Tasks" description="Keep every shared to-do in one calm place, from the first idea to the final detail." />
      <TaskFilters category={selectedCategory} status={selectedStatus} />
      <section className="paper-panel mt-8 p-5 sm:p-7">
        <h2 className="font-display text-2xl">Add a task</h2>
        <div className="mt-5"><TaskForm /></div>
      </section>
      <div className="mt-8 space-y-3">
        {visibleTasks.length ? visibleTasks.map((task) => <div id={`task-${task.id}`} key={task.id} className="scroll-mt-6"><TaskRow task={task} defaultOpen={task.id === editTaskId} /></div>) : <EmptyState title={selectedCategory ? `No ${selectedCategory} tasks yet` : "No tasks yet"} description="Add anything you want to remember. Your dated tasks will also join the Wedding Timeline." />}
      </div>
    </main>
  );
}
