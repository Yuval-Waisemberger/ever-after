// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildConversationWindow } from "@/lib/assistant/planning/conversation";
import { assistantContext } from "./fixtures";
import { uuid } from "./tools/database-double";
const mocks = vi.hoisted(() => ({ history: vi.fn(), from: vi.fn(), context: vi.fn(), create: vi.fn(), prepare: vi.fn(), profile: vi.fn() }));
vi.mock("next/headers", () => ({}));
vi.mock("@/lib/auth/user", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: async () => ({ id: "00000000-0000-4000-8000-000000000010" }) }));
vi.mock("@/lib/queries/assistant", () => ({ getAssistantContext: mocks.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
vi.mock("@/lib/assistant/planning/history-server", () => ({ readConversationWindow: mocks.history }));
vi.mock("@/lib/assistant/openai-client", () => ({ createOpenAIClient: () => ({ responses: { create: mocks.create } }) }));
vi.mock("@/lib/assistant/guardrails/execution", async importOriginal => ({
  ...await importOriginal<object>(), prepareAssistantTurn: mocks.prepare,
}));
import { POST } from "@/app/api/assistant/route";
import { LocalWeddingAssistantProvider } from "@/lib/assistant/local-provider";

const threadId = uuid(50), events: string[] = [];
let owned = true, userFailure = false, assistantFailure = false;
const prior = () => buildConversationWindow([{ id: uuid(60), role: "assistant", content: "Prior wedding guidance", created_at: "2026-09-08T00:00:00Z" }]);
function chain(data: unknown, error: unknown = null) {
  const promise = Promise.resolve({ data, error });
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: () => promise,
    single: () => promise, then: promise.then.bind(promise) };
}
const request = (thread: string | null = threadId) => new Request("http://localhost/api/assistant", { method: "POST", body: JSON.stringify({
  threadId: thread, requestId: uuid(70), message: "Unique current wedding question",
}) });
beforeEach(() => {
  vi.clearAllMocks(); events.length = 0; owned = true; userFailure = false; assistantFailure = false;
  vi.stubEnv("AI_PROVIDER", "openai"); vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder"); vi.stubEnv("OPENAI_MODEL", "unit-test-model");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
  mocks.profile.mockResolvedValue({ id: uuid(1), role: "couple" }); mocks.context.mockResolvedValue(assistantContext());
  mocks.history.mockImplementation(async () => { events.push("history"); return { status: "success", data: prior() }; });
  mocks.prepare.mockImplementation(async () => ({ failBeforeDispatch: vi.fn(), execute: async (run: () => Promise<unknown>) => run() }));
  mocks.from.mockImplementation(() => ({ ...chain(owned ? { id: threadId } : null),
    insert(values: { role?: string }) {
      events.push(values.role ?? "thread");
      return chain({ id: uuid(80), ...values }, (values.role === "user" && userFailure) || (values.role === "assistant" && assistantFailure) ? { message: "PRIVATE_ERROR" } : null);
    },
  }));
  mocks.create.mockImplementation(async () => {
    events.push("provider"); return { status: "completed", output: [{ type: "message", role: "assistant", status: "completed",
      content: [{ type: "output_text", text: "Wedding guidance", annotations: [] }] }] };
  });
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("approved prior-history route wiring", () => {
  it("reads bounded owned PRIOR history before current persistence and sends the current message exactly once", async () => {
    const response = await POST(request()); expect(response.status).toBe(200);
    expect(events).toEqual(["history", "user", "provider", "assistant"]);
    expect(mocks.history).toHaveBeenCalledExactlyOnceWith(threadId);
    const payload = mocks.create.mock.calls[0][0];
    expect(payload.input).toHaveLength(2); expect(payload.input[0].content).toContain("Prior wedding guidance");
    expect(JSON.stringify(payload.input).split("Unique current wedding question")).toHaveLength(2);
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it("keeps new-thread creation/persistence unchanged and sends no prior history for New Chat", async () => {
    expect((await POST(request(null))).status).toBe(200); expect(mocks.history).not.toHaveBeenCalled();
    expect(events).toEqual(["thread", "user", "provider", "assistant"]);
    expect(mocks.create.mock.calls[0][0].input).toEqual([{ role: "user", content: "Unique current wedding question" }]);
  });
  it("denies another Couple's thread before reading history, admission or persistence", async () => {
    owned = false; expect((await POST(request())).status).toBe(404);
    expect(mocks.history).not.toHaveBeenCalled(); expect(mocks.prepare).not.toHaveBeenCalled(); expect(events).toEqual([]);
  });
  it.each([null, { id: uuid(1), role: "vendor" }])("denies unauthorized profile %j before history", async profile => {
    mocks.profile.mockResolvedValue(profile); expect((await POST(request())).status).toBe(401); expect(mocks.history).not.toHaveBeenCalled();
  });
  it("fails closed on unavailable history before writes/admission without leaking reasons", async () => {
    mocks.history.mockResolvedValue({ status: "unavailable", reason: "PRIVATE_ERROR" });
    const response = await POST(request()); expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ errorCode: "THREAD_UNAVAILABLE" });
    expect(events).toEqual([]); expect(mocks.prepare).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("normalizes an unexpected history exception without persistence or raw error leakage", async () => {
    mocks.history.mockRejectedValue(new Error("PRIVATE_ERROR"));
    const response = await POST(request()); expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("PRIVATE_ERROR");
    expect(events).toEqual([]);
  });
  it("Local neither reads nor receives history and still loads the existing eager context", async () => {
    vi.stubEnv("AI_PROVIDER", "local"); vi.stubEnv("OPENAI_API_KEY", undefined); vi.stubEnv("OPENAI_MODEL", undefined);
    const respond = vi.spyOn(LocalWeddingAssistantProvider.prototype, "respond");
    expect((await POST(request())).status).toBe(200); expect(mocks.history).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.context).toHaveBeenCalledOnce(); expect(respond.mock.calls[0][0]).not.toHaveProperty("history");
  });
  it("still stops before provider execution after a user-message persistence failure", async () => {
    userFailure = true; const response = await POST(request()); expect(response.status).toBe(500);
    expect((await response.json()).errorCode).toBe("MESSAGE_NOT_SAVED"); expect(events).toEqual(["history", "user"]);
  });
  it("preserves safe assistant persistence failure", async () => {
    assistantFailure = true; const response = await POST(request()); expect(response.status).toBe(500);
    expect((await response.json()).errorCode).toBe("ANSWER_NOT_SAVED"); expect(events).toEqual(["history", "user", "provider", "assistant"]);
  });
});
