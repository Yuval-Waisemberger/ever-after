import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskForm } from "@/components/tasks/task-form";
import { taskAssigneeLabel } from "@/lib/domain/tasks";
vi.mock("@/lib/actions/tasks", () => ({saveTask:vi.fn()}));
describe("Task assignment labels", () => {
 it("uses canonical names as labels and stable slots as values; legacy defaults to other", () => {
  const host=document.createElement("div");
  host.innerHTML=renderToStaticMarkup(<TaskForm partnerNames={{partnerOne:"First saved name",partnerTwo:"Second saved name"}} initial={{assignee:null,dueDate:"2026-10-20"}}/>);
  const select=host.querySelector<HTMLSelectElement>('select[name=assignee]')!;
  expect(select.closest("label")?.textContent).toContain("Assigned to");
  expect([...select.options].map(o=>[o.value,o.text])).toEqual([["partner_one","First saved name"],["partner_two","Second saved name"],["other","Other"]]);
  expect(select.value).toBe("other");
  expect(host.querySelector<HTMLInputElement>('[name=dueDate]')?.value).toBe("2026-10-20");
  expect(taskAssigneeLabel("partner_one",{partnerOne:"Renamed",partnerTwo:"Second"})).toBe("Renamed");
 });
});
