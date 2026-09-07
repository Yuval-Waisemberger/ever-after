// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: "owner" as string | null, role: "couple", calls: [] as Array<[string, string, ...unknown[]]> }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => state.user ? [{ name: "sb-local-auth-token", value: "synthetic" }] : [] }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: state.user } } }) },
  from(table: string) {
    const filters: Record<string, unknown> = {}; const chain: Record<string, unknown> = {};
    for (const op of ["select", "eq", "single", "maybeSingle", "update", "delete", "insert"]) chain[op] = (...args: unknown[]) => { state.calls.push([table, op, ...args]); if (op === "eq") filters[String(args[0])] = args[1]; return chain; };
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null, data:
      table === "profiles" ? { id: state.user, role: state.role, display_name: "Synthetic", avatar_choice: "initials", avatar_storage_path: null } :
      table === "weddings" ? filters.owner_user_id === "owner" ? { id: "owned-wedding" } : null :
      filters.wedding_id === "owned-wedding" && filters.id === "11111111-1111-4111-8111-111111111111" ? { id: filters.id } : null }).then(resolve);
    return chain;
  },
}) }));
import { saveTask, changeTaskStatus, deleteTask } from "@/lib/actions/tasks";
const idle = { status: "idle" as const };
const form = (id: string) => { const f = new FormData(); Object.entries({ id, wedding_id: "another-wedding", title: "Title", notes: "", category: "", dueDate: "", status: "waiting_on_vendor", priority: "low" }).forEach(([k,v]) => f.set(k,v)); return f; };
beforeEach(() => { state.user = "owner"; state.role = "couple"; state.calls.length = 0; });
it.each([saveTask, changeTaskStatus, deleteTask])("uses real authorization and owner resolution; rejects another Couple task", async action => {
  const response = await action(idle, form("22222222-2222-4222-8222-222222222222"));
  expect(response.status).toBe("error");
  expect(state.calls).toContainEqual(["weddings", "eq", "owner_user_id", "owner"]);
  expect(state.calls).toContainEqual(["tasks", "eq", "wedding_id", "owned-wedding"]);
});
it.each([saveTask, changeTaskStatus, deleteTask])("rejects anonymous and Vendor accounts before task access", async action => {
  state.user = null; await expect(action(idle, form("11111111-1111-4111-8111-111111111111"))).rejects.toThrow("REDIRECT:/auth/couple");
  state.user = "owner"; state.role = "vendor"; await expect(action(idle, form("11111111-1111-4111-8111-111111111111"))).rejects.toThrow("REDIRECT:/vendor");
  expect(state.calls.some(c => c[0] === "tasks")).toBe(false);
});
