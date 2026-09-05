import type { Metadata } from "next";
import Link from "next/link";
import { Tags } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { getTasks } from "@/lib/queries/tasks";
import { TASK_CATEGORIES } from "@/lib/validation/task";

export const metadata: Metadata = { title: "Our Tasks" };

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const params = await searchParams;
  const selectedCategory = typeof params.category === "string" ? params.category : "";
  const editTaskId = typeof params.edit === "string" ? params.edit : "";
  const tasks = await getTasks();
  const visibleTasks = selectedCategory ? tasks.filter((task) => task.category === selectedCategory) : tasks;
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Plan together" title="Our Tasks" description="Keep every shared to-do in one calm place, from the first idea to the final detail." />
      <nav className="task-category-nav mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filter tasks by category">
        <Link href="/tasks" aria-current={!selectedCategory ? "page" : undefined} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-paper px-3.5 text-sm font-semibold"><Tags className="size-3.5" />All</Link>
        {TASK_CATEGORIES.map((category) => <Link key={category} href={`/tasks?category=${encodeURIComponent(category)}`} aria-current={selectedCategory === category ? "page" : undefined} className="inline-flex min-h-11 shrink-0 items-center rounded-full border bg-paper px-3.5 text-sm font-semibold">{category}</Link>)}
      </nav>
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
