import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { TasksWorkspace } from "./tasks-workspace";
import { israelCalendarDate } from "@/lib/domain/calendar";
import { getTasks } from "@/lib/queries/tasks";
import { TASK_STATUSES } from "@/lib/domain/tasks";
import "@/components/tasks/tasks-visual.css";

export const metadata: Metadata = { title: "Our Tasks" };

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const params = await searchParams;
  const selectedCategory = typeof params.category === "string" ? params.category : "";
  const editTaskId = typeof params.edit === "string" ? params.edit : "";
  const tasks = await getTasks();
  const selectedStatus = TASK_STATUSES.find(status => status === params.status) ?? "all";
  return (
    <main className="ea-consistent-page mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Plan together" title="Our Tasks" description="Keep every shared to-do in one calm place, from the first idea to the final detail." />
      <TasksWorkspace tasks={tasks} today={israelCalendarDate()} initialCategory={selectedCategory} initialStatus={selectedStatus} editTaskId={editTaskId} />
    </main>
  );
}
