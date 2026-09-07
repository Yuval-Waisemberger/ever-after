import Link from "next/link";
import { Tags } from "lucide-react";
import { TASK_CATEGORIES } from "@/lib/validation/task";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/domain/task-status";
export function TaskFilters({ category, status }: { category: string; status: TaskStatus | "all" }) {
  const filterLink = (category: string, status: string) => `/tasks?${new URLSearchParams({ ...(category ? { category } : {}), ...(status !== "all" ? { status } : {}) })}`;
  return <>
      <nav className="task-category-nav mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filter tasks by category">
        <Link href={filterLink("", status)} aria-current={!category ? "page" : undefined} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-paper px-3.5 text-sm font-semibold"><Tags className="size-3.5" />All</Link>
        {TASK_CATEGORIES.map((option) => <Link key={option} href={filterLink(option, status)} aria-current={category === option ? "page" : undefined} className="inline-flex min-h-11 shrink-0 items-center rounded-full border bg-paper px-3.5 text-sm font-semibold">{option}</Link>)}
      </nav>
      <nav aria-label="Filter tasks by status" className="mt-3 flex flex-wrap gap-2">
        {(["all", ...TASK_STATUSES] as const).map(option => <Link key={option} href={filterLink(category, option)} aria-current={status === option ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold ${status === option ? "bg-wine text-white" : "bg-paper text-ink"}`}>{option === "all" ? "All" : TASK_STATUS_LABELS[option]}</Link>)}
      </nav>
  </>;
}
