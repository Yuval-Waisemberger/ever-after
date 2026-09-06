import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { assistantContext } from "./fixtures";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), wedding: vi.fn(), context: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.wedding }));
vi.mock("@/lib/queries/assistant", () => ({ getAssistantContext: mocks.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
import { POST } from "@/app/api/assistant/route";
import { LocalWeddingAssistantProvider } from "@/lib/assistant/local-provider";
import { AssistantContextUnavailableError } from "@/lib/assistant/context-error";

const threadId = "00000000-0000-4000-8000-000000000001";
const writes: Array<{ table: string; values: Record<string, unknown> }> = [];
const scopes: unknown[][] = [];
let userInsertFails = false;
let assistantInsertFails = false;
let threadReadFails = false;
let threadExists = true;
function chain(result: { data: unknown; error: unknown }) {
  const promise = Promise.resolve(result);
  return {
    select: vi.fn().mockReturnThis(), eq: vi.fn((...args: unknown[]) => { scopes.push(args); return chain(result); }),
    single: () => promise, maybeSingle: () => promise, then: promise.then.bind(promise),
  };
}
function request(message = "What tasks do we have?", existingThread: string | null = threadId) {
  return new Request("http://localhost/api/assistant", { method: "POST", body: JSON.stringify({ message, threadId: existingThread }), headers: { "Content-Type": "application/json" } });
}
beforeEach(() => {
  vi.restoreAllMocks(); vi.clearAllMocks(); vi.stubEnv("AI_PROVIDER", "local");
  writes.length = 0; scopes.length = 0;
  userInsertFails = false; assistantInsertFails = false; threadReadFails = false; threadExists = true;
  mocks.profile.mockResolvedValue({ id: "couple", role: "couple" });
  mocks.wedding.mockResolvedValue({ id: "owned-wedding" });
  mocks.context.mockResolvedValue(assistantContext());
  mocks.from.mockImplementation((table: string) => ({
    ...chain({ data: threadExists ? { id: threadId } : null, error: threadReadFails ? { message: "secret DB error" } : null }),
    insert: (values: Record<string, unknown>) => {
      writes.push({ table, values });
      const failed = (values.role === "user" && userInsertFails) || (values.role === "assistant" && assistantInsertFails);
      return chain({ data: table === "assistant_threads" ? { id: threadId } : { id: "message-id", ...values }, error: failed ? { message: "secret insert failure" } : null });
    },
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("Assistant API persistence and permissions", () => {
  it("stops before context/provider generation if user-message insert fails", async () => {
    userInsertFails = true;
    const generate = vi.spyOn(LocalWeddingAssistantProvider.prototype, "respond");
    const response = await POST(request());
    expect(response.status).toBe(500);
    const body = await response.json(); expect(body.error).toContain("Your message could not be saved");
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(generate).not.toHaveBeenCalled(); expect(mocks.context).not.toHaveBeenCalled();
    expect(writes.map((item) => item.values.role)).toEqual(["user"]);
  });
  it("also stops after a new thread is created if its user message fails", async () => {
    userInsertFails = true;
    const generate = vi.spyOn(LocalWeddingAssistantProvider.prototype, "respond");
    expect((await POST(request("Plan our wedding", null))).status).toBe(500);
    expect(writes.map((item) => item.table)).toEqual(["assistant_threads", "assistant_messages"]);
    expect(generate).not.toHaveBeenCalled();
  });
  it("persists valid conversation messages in order, with validated evidence and no action", async () => {
    const response = await POST(request()); const body = await response.json();
    expect(response.status).toBe(200);
    expect(writes.map((item) => item.values.role)).toEqual(["user", "assistant"]);
    expect(new Set(writes.map((item) => item.table))).toEqual(new Set(["assistant_messages"]));
    expect(writes[1].values.action_proposal).toBeNull();
    expect(body.agent.evidence).toEqual([{ kind: "COUPLE_DATA", section: "tasks" }]);
    expect(body.message.source_labels).toEqual(["Couple data"]);
    expect(scopes).toContainEqual(["wedding_id", "owned-wedding"]);
  });
  it.each([null, { role: "vendor" }])("rejects unauthorized users before database calls", async (profile) => {
    mocks.profile.mockResolvedValue(profile);
    expect((await POST(request())).status).toBe(401); expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects invalid input before writes", async () => {
    expect((await POST(request(""))).status).toBe(400); expect(writes).toEqual([]);
  });
  it("rejects unsupported providers clearly before writes", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    const response = await POST(request());
    expect(response.status).toBe(503); expect((await response.json()).error).toContain("Unsupported AI_PROVIDER");
    expect(writes).toEqual([]);
  });
  it("rejects inaccessible threads and fails closed on thread read errors", async () => {
    threadExists = false;
    expect((await POST(request())).status).toBe(404);
    threadReadFails = true;
    expect((await POST(request())).status).toBe(503); expect(writes).toEqual([]);
  });
  it("returns unavailable context without persisting a fabricated response", async () => {
    mocks.context.mockRejectedValue(new AssistantContextUnavailableError("budget"));
    const response = await POST(request("What is our wedding budget?")); const body = await response.json();
    expect(response.status).toBe(503); expect(body.agent.status).toBe("unavailable");
    expect(body.error).toContain("couldn't access your budget");
    expect(writes.map((item) => item.values.role)).toEqual(["user"]);
  });
  it("redirects unrelated questions through the central policy without loading context", async () => {
    const response = await POST(request("Diagnose a rash before the wedding"));
    expect((await response.json()).agent.status).toBe("out_of_scope"); expect(mocks.context).not.toHaveBeenCalled();
  });
  it("returns a safe error when assistant-message persistence fails", async () => {
    assistantInsertFails = true;
    const response = await POST(request());
    expect(response.status).toBe(500); expect((await response.json()).error).toBe("The answer could not be saved.");
  });
  it("rejects an adapter's proposed product write before persistence", async () => {
    vi.spyOn(LocalWeddingAssistantProvider.prototype, "respond").mockResolvedValue({
      status: "ok", text: "Book a vendor", evidence: [{ kind: "AI_RECOMMENDATION" }],
      actionProposal: { type: "book_vendor", summary: "Book", arguments: { id: "vendor-id" }, requiresConfirmation: true },
    });
    expect((await POST(request())).status).toBe(503);
    expect(writes.map((item) => item.values.role)).toEqual(["user"]);
  });
  it("has no product mutation or executor dependency in the Agent core", () => {
    for (const file of readdirSync("src/lib/assistant").filter((name) => name.endsWith(".ts"))) {
      const source = readFileSync(`src/lib/assistant/${file}`, "utf8");
      expect(source).not.toMatch(/\.from\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(|@\/lib\/actions/);
    }
  });
});
