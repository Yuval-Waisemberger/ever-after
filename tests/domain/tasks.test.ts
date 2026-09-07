import { describe, expect, it } from "vitest";
import {
  calculateTaskCompletionPercentage,
  calculateTaskSummary,
  isDueWithinDays,
  selectUpcomingTasks,
  filterTasks,
  taskDisplayStatus,
} from "@/lib/domain/tasks";
import { isPastCalendarDate } from "@/lib/domain/date-status";

describe("task summaries", () => {
  it("calculates completion from tasks, not wedding progress", () => {
    expect(
      calculateTaskCompletionPercentage([
        { status: "completed" },
        { status: "completed" },
        { status: "open" },
      ]),
    ).toBe(67);
    expect(calculateTaskCompletionPercentage([])).toBe(0);
  });

  it("counts today through seven days from today", () => {
    const today = new Date("2026-09-02T18:00:00Z");
    expect(isDueWithinDays("2026-09-02", today, 7)).toBe(true);
    expect(isDueWithinDays("2026-09-09", today, 7)).toBe(true);
    expect(isDueWithinDays("2026-09-10", today, 7)).toBe(false);
  });

  it("makes completed counts explicit without creating a second source of truth", () => {
    const summary = calculateTaskSummary([
      { status: "completed", dueDate: "2026-09-01" },
      { status: "open", dueDate: "2026-09-08" },
      { status: "in_progress", dueDate: null },
      { status: "open", dueDate: "2026-10-01" },
    ], new Date("2026-09-02T12:00:00Z"));
    expect(summary).toEqual({ total: 4, completed: 1, open: 3, dueThisWeek: 1, completion: 25 });
  });

  it("keeps waiting workflow and overdue independent", () => {
    const today = new Date("2026-09-02T12:00:00Z");
    expect(taskDisplayStatus({ status: "waiting_on_vendor", dueDate: "2026-08-31" }, today)).toMatchObject({ workflow: { kind: "waiting_on_vendor", label: "Waiting on vendor" }, deadline: { kind: "overdue", label: "Overdue 2 days" } });
    expect(taskDisplayStatus({ status: "completed", dueDate: "2026-08-31" }, today).deadline).toBeNull();
    expect(taskDisplayStatus({ status: "open", dueDate: null }, today).deadline).toBeNull();
  });

  it("allows past dates as data and prioritizes overdue work before the next seven days", () => {
    const today = new Date("2026-09-02T12:00:00Z");
    expect(isPastCalendarDate("2026-09-01", today)).toBe(true);
    const selected = selectUpcomingTasks([
      { id: "future", dueDate: "2026-09-05", status: "open" as const, priority: "medium" as const },
      { id: "far", dueDate: "2026-10-05", status: "open" as const, priority: "high" as const },
      { id: "old-low", dueDate: "2026-08-30", status: "open" as const, priority: "low" as const },
      { id: "old-high", dueDate: "2026-09-01", status: "in_progress" as const, priority: "high" as const },
      { id: "done", dueDate: "2026-08-20", status: "completed" as const, priority: "high" as const },
      { id: "undated", dueDate: null, status: "open" as const, priority: "high" as const },
    ], today);
    expect(selected.map((task) => task.id)).toEqual(["old-high", "old-low", "future"]);
  });
});

it("uses Israel midnight including summer and winter boundaries", () => {
  expect(isPastCalendarDate("2026-09-07", new Date("2026-09-07T20:59:59Z"))).toBe(false);
  expect(isPastCalendarDate("2026-09-07", new Date("2026-09-07T21:00:00Z"))).toBe(true);
  expect(isPastCalendarDate("2026-01-07", new Date("2026-01-07T22:00:00Z"))).toBe(true);
});
it("waiting is open and filters intersect categories", () => {
  const waiting = { id: "w", status: "waiting_on_vendor" as const, category: "Venue", dueDate: "2026-09-09", priority: "low" as const };
  const tasks = [waiting, { ...waiting, id: "done", status: "completed" as const }, { ...waiting, id: "high", status: "open" as const, category: "Other", dueDate: null, priority: "high" as const }];
  const now = new Date("2026-09-07T12:00:00Z");
  expect(filterTasks(tasks, "waiting_on_vendor", "Venue")).toEqual([waiting]);
  expect(filterTasks(tasks, "incomplete")).toHaveLength(2);
  expect(calculateTaskSummary(tasks, now)).toEqual({ total: 3, completed: 1, open: 2, dueThisWeek: 1, completion: 33 });
});
