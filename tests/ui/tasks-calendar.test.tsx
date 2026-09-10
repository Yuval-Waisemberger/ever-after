import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { monthDays, TasksWorkspace } from "@/app/(couple)/tasks/tasks-workspace";

vi.mock("@/lib/actions/tasks", () => ({ saveTask: vi.fn(), changeTaskStatus: vi.fn(), deleteTask: vi.fn() }));
beforeAll(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterAll(() => vi.unstubAllGlobals());
const task = { id: "one", title: "First task", notes: null, category: "Venue", due_date: "2026-10-20", priority: "high" as const, status: "in_progress" as const };

describe("Tasks calendar", () => {
  it("uses Monday-first, complete weeks across leap days and year boundaries", () => {
    expect(monthDays("2026-10")[0]).toBe("2026-09-28");
    expect(monthDays("2026-10").at(-1)).toBe("2026-11-01");
    expect(monthDays("2024-02")).toContain("2024-02-29");
    expect(monthDays("2027-01")[0]).toBe("2026-12-28");
    expect(monthDays("2026-03")).toContain("2026-03-29");
  });
  it("shows all date matches and mixed statuses, prefills the original form, and preserves list nodes on selection", async () => {
    const host = document.createElement("div"); document.body.append(host);
    const root = createRoot(host);
    const render = (date: string | null = null) => <TasksWorkspace tasks={[task, { ...task, id: "two", title: "Second task", status: "completed" }, { ...task, id: "three", title: "Undated task", due_date: date }]} today="2026-10-10" initialCategory="" initialStatus="all" editTaskId="" />;
    try {
      await act(async () => root.render(render()));
      const row = host.querySelector('[id="task-one"] article');
      const date = host.querySelector<HTMLButtonElement>('[aria-label="20 October 2026, 2 tasks"]')!;
      expect(date.querySelectorAll("i")).toHaveLength(2);
      await act(async () => date.click());
      expect(host.querySelector('[id="task-one"] article')).toBe(row);
      expect(row?.hasAttribute("data-task-motion")).toBe(false);
      expect(host.querySelector('[aria-live="polite"]')?.textContent).toBeTruthy();
      const selected = [...host.querySelectorAll("div[aria-live=polite]")][0];
      expect(selected.querySelectorAll("article")).toHaveLength(2);
      const dialog = host.querySelector("dialog")!;
      dialog.showModal = vi.fn();
      await act(async () => [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Add task on this date"))!.click());
      expect(dialog.showModal).toHaveBeenCalledOnce();
      expect(dialog.querySelector<HTMLInputElement>('[name="dueDate"]')?.value).toBe("2026-10-20");
      await act(async () => root.render(render("2026-10-20")));
      expect(host.querySelector('[aria-label="Undated tasks"]')?.querySelectorAll("article")).toHaveLength(0);
      expect(selected.querySelectorAll("article")).toHaveLength(3);
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
});
