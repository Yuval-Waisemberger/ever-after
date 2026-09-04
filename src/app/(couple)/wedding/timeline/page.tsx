import type { Metadata } from "next";
import Link from "next/link";
import { Circle, CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { buildTimeline } from "@/lib/domain/timeline";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { getTasks } from "@/lib/queries/tasks";

export const metadata: Metadata = { title: "Wedding Timeline" };

export default async function TimelinePage() {
  const [wedding, tasks] = await Promise.all([getOwnedWedding(), getTasks()]);
  const groups = buildTimeline(tasks.map((task) => ({ id: task.id, title: task.title, dueDate: task.due_date, status: task.status })), wedding.wedding_date);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="My Wedding" title="Wedding Timeline" description={wedding.wedding_date ? "The same dated tasks, arranged relative to your wedding day." : "Your dated tasks by calendar month. Set a wedding date to see relative time-to-go groups."} action={<LinkButton href="/tasks" tone="secondary">Manage tasks</LinkButton>} />
      <div className="mt-10">
        {groups.length ? (
          <ol className="relative space-y-10 before:absolute before:bottom-3 before:left-[0.7rem] before:top-3 before:w-px before:bg-line">
            {groups.map((group) => (
              <li key={group.key} className="relative pl-10">
                <span className="absolute left-0 top-1 grid size-6 place-items-center rounded-full border border-gold bg-canvas" />
                <h2 className="font-display text-3xl text-wine">{group.label}</h2>
                <div className="mt-4 space-y-2">
                  {group.tasks.map((task) => (
                    <Link key={task.id} href="/tasks" className="timeline-entry flex items-center gap-3 rounded-xl border bg-paper px-4 py-3 text-sm font-semibold hover:border-gold">
                      {task.status === "completed" ? <CircleCheck className="size-4 text-sage" /> : <Circle className="size-4 text-gold" />}
                      <span className={task.status === "completed" ? "text-ink-soft line-through" : ""}>{task.title}</span>
                      <time className="ml-auto text-xs font-normal text-ink-soft">{task.dueDate}</time>
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="No dated tasks yet" description="Add a due date to any task and it will appear here automatically." action={<LinkButton href="/tasks">Add a task</LinkButton>} />
        )}
      </div>
    </main>
  );
}
