import type { ReactNode } from "react";

/** The viewport is bounded; the list itself always contains every filtered task. */
export function TaskListPanel({ count, filters, children }: { count: number; filters: ReactNode; children: ReactNode }) {
  return <section className="tasks-list-panel mt-7" aria-label="Your tasks">
    <div className="tasks-list-heading">
      <h2 className="font-display text-2xl">Your to-do list</h2>
      <span className="text-xs text-ink-soft">{count} {count === 1 ? "task" : "tasks"}</span>
    </div>
    {filters}
    <div className="tasks-scroll-region" role="region" aria-label="Task list" tabIndex={0}>
      {children}
    </div>
  </section>;
}
