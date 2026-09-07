// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ owned: vi.fn(), refresh: vi.fn(), calls: [] as Array<[string, ...unknown[]]>, result: { data: { id: "task" } as unknown, error: null as unknown } }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.owned }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from(table: string) {
  mocks.calls.push(["from", table]); const chain: Record<string, unknown> = {};
  for (const op of ["insert", "update", "delete", "eq", "select", "single", "maybeSingle"]) chain[op] = (...args: unknown[]) => { mocks.calls.push([op, ...args]); return chain; };
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mocks.result).then(resolve); return chain;
} }) }));
import { saveTask, changeTaskStatus, deleteTask } from "@/lib/actions/tasks";
const id = "11111111-1111-4111-8111-111111111111";
const idle = { status: "idle" as const };
const form = (extra = {}) => { const f = new FormData(); Object.entries({ title: "Contract", notes: "Private", category: "Venue", dueDate: "2026-09-07", priority: "high", status: "waiting_on_vendor", ...extra }).forEach(([k,v]) => f.set(k, String(v))); return f; };
beforeEach(() => { vi.clearAllMocks(); mocks.calls.length = 0; mocks.owned.mockResolvedValue({ id: "owned" }); mocks.result = { data: { id }, error: null }; });
it("creates waiting without vendor linkage and ignores forged wedding ownership", async () => {
  expect(await saveTask(idle, form({ wedding_id: "forged" }))).toMatchObject({ status: "success" });
  expect(mocks.calls).toContainEqual(["insert", { wedding_id: "owned", title: "Contract", notes: "Private", category: "Venue", due_date: "2026-09-07", priority: "high", status: "waiting_on_vendor" }]);
  expect(mocks.calls.filter(c => c[0] === "from")).toEqual([["from", "tasks"]]);
});
it.each(["open", "in_progress", "waiting_on_vendor", "completed"])("edits and changes workflow freely to %s", async status => {
  expect(await saveTask(idle, form({ id, status }))).toMatchObject({ status: "success" });
  expect(await changeTaskStatus(idle, form({ id, status }))).toMatchObject({ status: "success" });
  expect(mocks.calls).toContainEqual(["eq", "id", id]); expect(mocks.calls).toContainEqual(["eq", "wedding_id", "owned"]);
  expect(mocks.refresh).toHaveBeenCalledWith("/wedding/timeline");
});
it("deletes with owned scope", async () => { expect(await deleteTask(idle, form({ id }))).toMatchObject({ status: "success" }); expect(mocks.calls).toContainEqual(["eq", "wedding_id", "owned"]); });
it.each([saveTask, changeTaskStatus, deleteTask])("rejects DB errors and zero rows without success/revalidation", async action => {
  for (const result of [{ data: null, error: { message: "PRIVATE SQL" } }, { data: null, error: null }]) {
    mocks.result = result;
    const response = await action(idle, form({ id }));
    expect(response.status).toBe("error"); expect(response.message).not.toContain("PRIVATE"); expect(mocks.refresh).not.toHaveBeenCalled();
  }
});
it.each([saveTask, changeTaskStatus, deleteTask])("rejects malformed IDs", async action => { expect(await action(idle, form({ id: "forged" }))).toMatchObject({ status: "error" }); expect(mocks.calls).toEqual([]); });
it.each(["anonymous", "vendor", "no owned wedding"])("stops every mutation when authorization fails: %s", async reason => {
  mocks.owned.mockRejectedValue(new Error(reason));
  for (const action of [saveTask, changeTaskStatus, deleteTask]) await expect(action(idle, form({ id }))).rejects.toThrow(reason);
  expect(mocks.calls).toEqual([]);
});
it("returns every relevant field error and rejects stored overdue", async () => {
  const response = await saveTask(idle, form({ title: "", notes: "x".repeat(3001), category: "x".repeat(81), dueDate: "invalid", priority: "invalid", status: "overdue" }));
  expect(Object.keys(response.errors ?? {})).toEqual(["title", "notes", "category", "dueDate", "priority", "status"]);
  expect(await changeTaskStatus(idle, form({ id, status: "overdue" }))).toMatchObject({ status: "error" }); expect(mocks.calls).toEqual([]);
});
