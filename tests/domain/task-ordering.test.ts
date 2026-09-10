import { describe, expect, it } from "vitest";
import { compareTaskPriorityDate, filterTasks, taskCategory } from "@/lib/domain/tasks";

describe("Task classification and ordering", () => {
 it("sorts priority, valid dates then IDs without mutating input", () => {
  const tasks = [
   { id: "f", priority: null, due_date: "2026-01-01" },
   { id: "e", priority: "low", due_date: null },
   { id: "d", priority: "medium", due_date: "2026-01-01" },
   { id: "c", priority: " HIGH ", due_date: "2026-02-30" },
   { id: "b", priority: "high", due_date: "2026-03-01" },
   { id: "a", priority: "high", due_date: "2026-03-01" },
  ];
  expect([...tasks].sort(compareTaskPriorityDate).map(t => t.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
  expect(tasks[0].id).toBe("f");
  expect(compareTaskPriorityDate({id:"a",priority:"unknown",due_date:""},{id:"b",priority:"",due_date:null})).toBeLessThan(0);
 });
 it("uses Other consistently without changing records", () => {
  const tasks = [{status:"open" as const,category:null},{status:"open" as const,category:"  "},{status:"open" as const,category:"Other"}];
  expect(filterTasks(tasks,"all","Other")).toHaveLength(3);
  expect(taskCategory(undefined)).toBe("Other");
  expect(tasks[0].category).toBeNull();
 });
});
