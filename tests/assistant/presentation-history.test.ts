import { beforeEach, describe, expect, it, vi } from "vitest";
import { weddingContextChips } from "@/components/assistant/presentation";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.owner }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
import { readAssistantHistory, readAssistantConversation } from "@/app/(couple)/assistant/history-actions";
const id = "00000000-0000-4000-8000-000000000001";
const calls: Array<[string, string, ...unknown[]]> = [];
let owned: boolean, fail: boolean;
beforeEach(() => {
  vi.clearAllMocks(); calls.length = 0; owned = true; fail = false;
  mocks.owner.mockResolvedValue({ id: "owned-wedding" });
  mocks.from.mockImplementation((table: string) => {
    let single = false;
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "range", "maybeSingle"]) query[method] = (...args: unknown[]) => {
      calls.push([table, method, ...args]); if (method === "maybeSingle") single = true; return query;
    };
    query.then = (resolve: (value: unknown) => void) => resolve({ error: fail ? "PRIVATE_FAILURE" : null, data: single ? owned ? { id } : null : Array.from({ length: table === "assistant_threads" ? 31 : 51 }, (_, n) => ({ id: String(n), title: "Saved conversation", role: "assistant", content: "A summary", source_labels: [], created_at: String(n) })) });
    return query;
  });
});
describe("Assistant presentation-only history", () => {
  it("bounds thread pages and scopes them to the server-owned wedding", async () => {
    const result = await readAssistantHistory(30);
    expect(result?.threads).toHaveLength(30); expect(result?.hasMore).toBe(true);
    expect(calls).toContainEqual(["assistant_threads", "eq", "wedding_id", "owned-wedding"]);
    expect(calls).toContainEqual(["assistant_threads", "range", 30, 60]);
  });
  it("checks ownership before reading messages, returns chronological bounded history", async () => {
    const result = await readAssistantConversation(id, 50);
    expect(result?.messages).toHaveLength(50); expect(result?.messages[0].id).toBe("49");
    expect(result?.hasMore).toBe(true);
    expect(calls).toContainEqual(["assistant_threads", "eq", "wedding_id", "owned-wedding"]);
    expect(calls).toContainEqual(["assistant_messages", "range", 50, 100]);
    expect(calls).toContainEqual(["assistant_messages", "select", "id, role, content, source_labels, created_at"]);
  });
  it("denies forged/cross-Couple threads without querying messages", async () => {
    owned = false; expect(await readAssistantConversation(id)).toBeNull();
    expect(calls.some(([table]) => table === "assistant_messages")).toBe(false);
  });
  it.each(["Vendor", "anonymous"])("preserves the %s role guard", async () => {
    mocks.owner.mockRejectedValue(new Error("AUTH_REQUIRED"));
    expect(await readAssistantHistory()).toBeNull(); expect(await readAssistantConversation(id)).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects invalid IDs/offsets and never exposes database failures", async () => {
    expect(await readAssistantConversation("forged")).toBeNull(); expect(await readAssistantHistory(-1)).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled(); fail = true;
    expect(await readAssistantHistory()).toBeNull(); expect(await readAssistantConversation(id)).toBeNull();
  });
  it("only builds five explicit public-to-the-couple display fields, never invented context", () => {
    expect(weddingContextChips({})).toEqual([]);
    const wedding = { styles: ["romantic", "vintage", "classic"], preferred_area: "central_israel", guest_count: 240, total_budget_minor: 17000000, priorities: ["photography"], notes: "PRIVATE", id: "PRIVATE" };
    const chips = weddingContextChips(wedding);
    expect(chips).toHaveLength(5); expect(chips.join()).toContain("Romantic · Vintage");
    expect(chips.join()).toContain("170,000"); expect(chips.join()).not.toContain("PRIVATE");
  });
});
