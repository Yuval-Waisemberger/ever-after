import type { Metadata } from "next";
import Link from "next/link";
import { CalendarHeart, CalendarPlus, Circle, CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { buildTimeline } from "@/lib/domain/timeline";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { getTasks } from "@/lib/queries/tasks";
import { TaskStatusPill } from "@/components/tasks/task-status-pill";
import { formatCalendarDate } from "@/lib/domain/date-status";

export const metadata: Metadata = { title: "Wedding Timeline" };

export default async function TimelinePage() {
  const [wedding, tasks] = await Promise.all([getOwnedWedding(), getTasks()]);
  const groups = buildTimeline(tasks.map((task) => ({ id: task.id, title: task.title, dueDate: task.due_date, status: task.status })), wedding.wedding_date);
  const unscheduledTasks = tasks.filter((task) => !task.due_date);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Our Wedding" title="Wedding Timeline" description={wedding.wedding_date ? "Follow each dated task as it leads toward your wedding day." : "Your dated tasks are arranged by calendar month until you choose a wedding date."} action={<LinkButton href="/tasks" tone="secondary">Manage tasks</LinkButton>} />
      <div className="mt-10">
        {groups.length || wedding.wedding_date ? (
          <ol className="relative space-y-10 before:absolute before:bottom-3 before:left-[0.7rem] before:top-3 before:w-px before:bg-line">
            {groups.map((group) => (
              <li key={group.key} className="relative pl-10">
                <span className="absolute left-0 top-1 grid size-6 place-items-center rounded-full border border-gold bg-canvas" />
                <h2 className="font-display text-3xl text-wine">{group.label}</h2>
                <div className="mt-4 space-y-2">
                  {group.tasks.map((task) => (
                    <Link key={task.id} href={`/tasks?edit=${task.id}#task-${task.id}`} className="timeline-entry flex flex-wrap items-center gap-3 rounded-xl border bg-paper px-4 py-3 text-sm font-semibold hover:border-gold">
                      {task.status === "completed" ? <CircleCheck className="size-4 text-sage" /> : <Circle className="size-4 text-gold" />}
                      <span className={task.status === "completed" ? "text-ink-soft line-through" : ""}>{task.title}</span>
                      <span className="min-w-0 sm:ml-auto"><TaskStatusPill status={task.status} dueDate={task.dueDate} /></span>
                      <time className="text-xs font-normal text-ink-soft">{formatCalendarDate(task.dueDate!)}</time>
                    </Link>
                  ))}
                </div>
              </li>
            ))}
            {wedding.wedding_date ? (
              <li className="timeline-destination relative pl-10">
                <span className="absolute left-0 top-1 grid size-6 place-items-center rounded-full border border-wine bg-wine text-white">
                  <CalendarHeart className="size-3.5" aria-hidden="true" />
                </span>
                <p className="eyebrow">The destination</p>
                <h2 className="font-display mt-1 text-3xl text-wine">Your Wedding Day</h2>
                <time className="mt-2 block text-sm text-ink-soft" dateTime={wedding.wedding_date}>
                  {new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${wedding.wedding_date}T00:00:00Z`))}
                </time>
                {!groups.length ? <p className="mt-4 max-w-xl text-sm leading-6 text-ink-soft">No dated tasks yet. Add a due date to any task and it will join the path above your wedding day.</p> : null}
              </li>
            ) : null}
          </ol>
        ) : (
          <EmptyState title="No dated tasks yet" description="Add a due date to any task and it will appear here automatically." action={<LinkButton href="/tasks">Add a task</LinkButton>} />
        )}
      </div>
      {unscheduledTasks.length ? (
        <section className="timeline-unscheduled mt-12 border-t pt-8" aria-labelledby="unscheduled-tasks-title">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#EEE7DD] text-[#625B54]"><CalendarPlus className="size-4.5" aria-hidden="true" /></span>
            <div>
              <p className="eyebrow">Not on the calendar yet</p>
              <h2 id="unscheduled-tasks-title" className="font-display mt-1 text-3xl">Unscheduled Tasks</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">These tasks are still part of your plan. Add a due date and each one will move into its correct place on the Timeline automatically.</p>
            </div>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {unscheduledTasks.map((task) => (
              <li key={task.id} className="flex min-w-0 items-center gap-3 rounded-xl border bg-paper p-4">
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${task.status === "completed" ? "text-ink-soft line-through" : ""}`}>{task.title}</p>
                  <div className="mt-2"><TaskStatusPill status={task.status} dueDate={null} /></div>
                </div>
                <Link href={`/tasks?edit=${task.id}#task-${task.id}`} className="ea-button shrink-0 border-line bg-paper px-3 text-wine hover:border-wine">Add date</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
