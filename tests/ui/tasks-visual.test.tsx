import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskListPanel } from "@/components/tasks/task-list-panel";

vi.mock("@/lib/actions/tasks", () => ({ saveTask: vi.fn(), changeTaskStatus: vi.fn(), deleteTask: vi.fn() }));
const task = { id: "synthetic-task", title: "Wait for final confirmation", notes: "Private note", category: "Venue", due_date: null, priority: "high" as const, status: "waiting_on_vendor" as const };
beforeAll(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterAll(() => vi.unstubAllGlobals());

describe("Task presentation", () => {
  it("keeps every task in the accessible scroll region", () => {
    const markup = renderToStaticMarkup(<TaskListPanel count={9} filters={<nav aria-label="Filters" />}>{Array.from({ length: 9 }, (_, i) => <TaskRow key={i} task={{ ...task, id: String(i) }} />)}</TaskListPanel>);
    const doc = new DOMParser().parseFromString(markup, "text/html");
    expect(doc.querySelectorAll('[aria-label="Task list"] article')).toHaveLength(9);
    expect(doc.querySelector('[aria-label="Task list"]')?.getAttribute("tabindex")).toBe("0");
    expect(doc.querySelector("article")?.hasAttribute("data-task-motion")).toBe(false);
  });

  it("animates changed persisted status, but never a first render or an unchanged waiting task", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<TaskRow task={task} />));
      expect(host.querySelector("article")?.hasAttribute("data-task-motion")).toBe(false);
      await act(async () => root.render(<TaskRow task={{ ...task }} />));
      expect(host.querySelector("article")?.hasAttribute("data-task-motion")).toBe(false);
      await act(async () => root.render(<TaskRow task={{ ...task, status: "completed" }} />));
      expect(host.querySelector("article")?.getAttribute("data-task-motion")).toBe("complete");
      expect(host.querySelector('[aria-label="Reopen Wait for final confirmation"]')).not.toBeNull();
      await act(async () => root.render(<TaskRow task={{ ...task, status: "open" }} />));
      expect(host.querySelector("article")?.getAttribute("data-task-motion")).toBe("reopen");
      await act(async () => root.render(<TaskRow task={{ ...task, status: "in_progress" }} />));
      expect(host.querySelector("article")?.hasAttribute("data-task-motion")).toBe(false);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it("renders an already completed task without replaying a success animation", () => {
    const markup = renderToStaticMarkup(<TaskRow task={{ ...task, status: "completed" }} />);
    expect(markup).toContain('data-status="completed"');
    expect(markup).not.toContain("data-task-motion");
    expect(markup).toContain("Private note");
  });
});
