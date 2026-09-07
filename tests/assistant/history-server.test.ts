import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from, auth: { getUser: mocks.getUser } }) }));
import { readConversationWindow } from "@/lib/assistant/planning/history-server";

const threadId = "00000000-0000-4000-8000-000000000001";
let role: string, failedTable: string | null, ownedThread: boolean;
let messages: Array<Record<string, unknown>>;
const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
beforeEach(() => {
  vi.clearAllMocks(); role = "couple"; failedTable = null; ownedThread = true; calls.length = 0;
  messages = [{ id: threadId, role: "user", content: "Compare those vendors", created_at: "2026-09-07T10:00:00Z" }];
  mocks.getUser.mockResolvedValue({ data: { user: { id: "authenticated-user" } }, error: null });
  mocks.from.mockImplementation((table: string) => {
    const data = table === "profiles" ? { role } : table === "weddings" ? { id: "owned-wedding" } : table === "assistant_threads" ? ownedThread ? { id: threadId } : null : messages;
    const resolved = Promise.resolve({ data, error: table === failedTable ? { message: "PRIVATE_DB_ERROR" } : null });
    const query: Record<string, unknown> = { then: resolved.then.bind(resolved), maybeSingle: () => resolved };
    for (const method of ["select", "eq", "order", "limit"]) query[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return query; };
    return query;
  });
});
describe("future application-owned conversation reader", () => {
  it("authenticates and scopes thread ownership before a bounded newest-message read", async () => {
    expect((await readConversationWindow(threadId)).status).toBe("success");
    expect(calls).toEqual(expect.arrayContaining([
      { table: "weddings", method: "eq", args: ["owner_user_id", "authenticated-user"] },
      { table: "assistant_threads", method: "eq", args: ["wedding_id", "owned-wedding"] },
      { table: "assistant_messages", method: "eq", args: ["thread_id", threadId] },
      { table: "assistant_messages", method: "select", args: ["id, role, content, created_at"] },
      { table: "assistant_messages", method: "limit", args: [9] },
    ]));
  });
  it.each(["unauthenticated", "vendor", "other_thread"])("fails closed for %s", async (scenario) => {
    if (scenario === "unauthenticated") mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    if (scenario === "vendor") role = "vendor";
    if (scenario === "other_thread") ownedThread = false;
    expect(await readConversationWindow(threadId)).toMatchObject({ status: "unavailable", reason: "not_authorized" });
    expect(calls.some((call) => call.table === "assistant_messages")).toBe(false);
  });
  it.each(["profiles", "weddings", "assistant_threads", "assistant_messages"])("does not turn %s read failure into empty history", async (table) => {
    failedTable = table; const result = await readConversationWindow(threadId);
    expect(result).toEqual({ status: "unavailable", reason: "source_unavailable" }); expect(JSON.stringify(result)).not.toContain("PRIVATE_DB_ERROR");
  });
  it("distinguishes real empty history, invalid inputs and bounded lookahead", async () => {
    expect(await readConversationWindow("invalid")).toMatchObject({ reason: "invalid_input" }); expect(mocks.from).not.toHaveBeenCalled();
    messages = []; expect((await readConversationWindow(threadId)).status).toBe("empty");
    messages = Array.from({ length: 9 }, (_, n) => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, role: "user", content: "Recent", created_at: "2026-09-07T10:00:00Z" }));
    const result = await readConversationWindow(threadId);
    expect(result).toMatchObject({ status: "success", data: { hasOlderMessages: true, providerReady: false } });
    if (result.data) expect(result.data.messages).toHaveLength(8);
  });
});
