"use client";

import { Fragment, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskForm } from "@/components/tasks/task-form";
import { filterTasks } from "@/lib/domain/tasks";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/domain/task-status";
import { TASK_CATEGORIES } from "@/lib/validation/task";
import styles from "./tasks-workspace.module.css";

type Task = ComponentProps<typeof TaskRow>["task"];
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

// Date-only arithmetic: neither browser timezone nor daylight saving shifts a task.
export function monthDays(month: string) {
  const [year, number] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => new Date(Date.UTC(year, number - 1, 1 - offset + index)).toISOString().slice(0, 10));
}

export function TasksWorkspace({ tasks, today, initialCategory, initialStatus, editTaskId }: { tasks: Task[]; today: string; initialCategory: string; initialStatus: TaskStatus | "all"; editTaskId: string }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState(initialStatus);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [draft, setDraft] = useState({ dueDate: "", version: 0 });
  const [canvasBounds, setCanvasBounds] = useState({ left: 0, top: 0 });
  const dialog = useRef<HTMLDialogElement>(null);
  const openForm = (dueDate = "") => {
    const sidebar = document.querySelector(".workspace-sidebar")?.getBoundingClientRect();
    const header = document.querySelector(".workspace-mobile-header")?.getBoundingClientRect();
    setCanvasBounds({ left: sidebar?.width ? sidebar.right : 0, top: header?.height ? Math.max(0, header.bottom) : 0 });
    setDraft(current => ({ dueDate, version: current.version + 1 }));
    dialog.current?.showModal();
  };
  const visible = filterTasks(tasks, status, category).filter(task => `${task.title} ${task.notes ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const datedIncomplete = tasks.filter(task => task.due_date && task.status !== "completed").sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const nextDate = datedIncomplete.find(task => task.due_date! >= today)?.due_date ?? datedIncomplete[0]?.due_date;
  const group = (task: Task) => task.status === "completed" ? 3 : !task.due_date ? 2 : task.due_date === nextDate ? 0 : 1;
  const labels = ["Next up", "Other dated tasks", "No date yet", "Completed"];
  const ordered = [...visible].sort((a, b) => group(a) - group(b) || (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const selectedTasks = tasks.filter(task => task.due_date === selected);
  const undated = tasks.filter(task => !task.due_date);
  const changeMonth = (amount: number) => {
    const [year, number] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(year, number - 1 + amount, 1)).toISOString().slice(0, 7));
  };
  return <div className={styles.workspace}>
    <section className={styles.panel} aria-label="Your tasks">
      <div className={styles.heading}><h2>Your to-do list</h2><button type="button" className={styles.primary} onClick={() => openForm()}><Plus size={18} /> Add task</button></div>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={19} aria-hidden="true" /><input aria-label="Search tasks" placeholder="Search tasks" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <select aria-label="Task category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{[...new Set([...TASK_CATEGORIES, ...tasks.flatMap(task => task.category ? [task.category] : [])])].map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="Task status" value={status} onChange={event => setStatus(event.target.value as TaskStatus | "all")}><option value="all">All statuses</option>{TASK_STATUSES.map(value => <option key={value} value={value}>{TASK_STATUS_LABELS[value]}</option>)}</select>
      </div>
      <div className={`tasks-scroll-region ${styles.list}`} role="region" aria-label="Task list" tabIndex={0}>
        {ordered.map((task, index) => <Fragment key={task.id}>
          {index === 0 || group(ordered[index - 1]) !== group(task) ? <h3 className={styles.group}>{labels[group(task)]}<span>{visible.filter(item => group(item) === group(task)).length} {visible.filter(item => group(item) === group(task)).length === 1 ? "task" : "tasks"}</span></h3> : null}
          <div id={`task-${task.id}`}><TaskRow task={task} defaultOpen={task.id === editTaskId} /></div>
        </Fragment>)}
        {!visible.length ? <p className={styles.empty}>No tasks match these filters.</p> : null}
      </div>
    </section>
    <section aria-labelledby="task-calendar-title" className={styles.calendarSection}>
      <p className={styles.eyebrow}>Task calendar</p><h2 id="task-calendar-title">Your tasks at a glance</h2><p>Choose a date to see everything planned for that day.</p>
      <div className={`${styles.panel} ${styles.calendarLayout}`}>
        <div className={styles.calendar}>
          <div className={styles.month}><button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft /></button><h3 aria-live="polite">{dateLabel(`${month}-01`, { month: "long", year: "numeric" })}</h3><button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight /></button></div>
          <div className={styles.week}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div>
          <div className={styles.grid} role="group" aria-label="Calendar dates">
            {monthDays(month).map(date => { const dayTasks = tasks.filter(task => task.due_date === date); return <button type="button" key={date} aria-label={`${dateLabel(date, { day: "numeric", month: "long", year: "numeric" })}, ${dayTasks.length} tasks`} aria-pressed={date === selected} aria-current={date === today ? "date" : undefined} data-outside={!date.startsWith(month)} onClick={() => setSelected(date)}><span>{Number(date.slice(-2))}</span><span className={styles.markers}>{TASK_STATUSES.filter(value => dayTasks.some(task => task.status === value)).map(value => <i key={value} data-status={value} title={TASK_STATUS_LABELS[value]} />)}</span></button>; })}
          </div>
          <div className={styles.legend}>{TASK_STATUSES.map(value => <span key={value}><i data-status={value} />{TASK_STATUS_LABELS[value]}</span>)}</div>
        </div>
        <div className={styles.selected} aria-live="polite"><p className={styles.eyebrow}>Selected date</p><h3>{dateLabel(selected, { day: "numeric", month: "long", year: "numeric" })}</h3><p>{selectedTasks.length} {selectedTasks.length === 1 ? "task" : "tasks"}</p>
          <div className={`tasks-scroll-region ${styles.dateRows}`}>{selectedTasks.map(task => <TaskRow key={task.id} task={task} />)}{!selectedTasks.length ? <p className={styles.empty}>No tasks planned for this date.</p> : null}</div>
          <button type="button" className={styles.outline} onClick={() => openForm(selected)}><Plus size={19} /> Add task on this date</button>
        </div>
      </div>
      <section className={`${styles.panel} ${styles.undated}`} aria-label="Undated tasks"><h3 className={styles.group}>No date yet <span>{undated.length} {undated.length === 1 ? "task" : "tasks"}</span></h3><p>Use Edit task to assign a date.</p><div className={`tasks-scroll-region ${styles.dateRows}`}>{undated.map(task => <TaskRow key={task.id} task={task} />)}{!undated.length ? <p>Every task has a date.</p> : null}</div></section>
    </section>
    <dialog ref={dialog} className={styles.drawer} style={{ "--tasks-canvas-left": `${canvasBounds.left}px`, "--tasks-canvas-top": `${canvasBounds.top}px` } as CSSProperties} aria-labelledby="tasks-add-title">
      <button type="button" className={styles.close} aria-label="Close add task" onClick={() => dialog.current?.close()}><X /></button><p className={styles.eyebrow}>Plan together</p><h2 id="tasks-add-title">Add a task</h2><p>Add the details now — you can always refine them later.</p>
      <div className={styles.form}><TaskForm key={draft.version} initial={{ dueDate: draft.dueDate }} /></div><button type="button" className={styles.outline} onClick={() => dialog.current?.close()}>Cancel</button>
    </dialog>
  </div>;
}
