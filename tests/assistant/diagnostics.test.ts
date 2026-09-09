// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { formatConsoleArgs } from "next/dist/client/lib/console";
import { withAssistantDiagnostics, identifyAssistantDiagnostic, logAssistantDiagnostic } from "@/lib/assistant/diagnostics";
import { OpenAIWeddingAssistantProvider } from "@/lib/assistant/openai-provider";
import { runWeddingAgent } from "@/lib/assistant/agent";
import * as trust from "@/lib/assistant/openai-tool-trust";
import { prepareAssistantTurn } from "@/lib/assistant/guardrails/execution";
import { database, uuid } from "./tools/database-double";
import { buildConversationWindow } from "@/lib/assistant/planning/conversation";

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("next/headers", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
const requestId = uuid(990), secret = "PRIVATE_PAYLOAD_SENTINEL";
let db: ReturnType<typeof database>, events: Record<string, unknown>[], retained: string[], network: number;
beforeEach(() => {
  events = []; retained = []; network = 0; db = database(); mocks.client.mockReset().mockResolvedValue(db.client);
  vi.spyOn(console, "info").mockImplementation((...args) => {
    expect(args).toHaveLength(1); expect(typeof args[0]).toBe("string");
    // Exercise the exact formatter used by Next.js console-file.js, then its JSONL record.
    const line = JSON.parse(JSON.stringify({ message: formatConsoleArgs(args) })).message as string;
    retained.push(line); events.push(JSON.parse(line.slice("assistant_diagnostic ".length)));
  });
  const blocked = () => { network++; throw new Error("Network forbidden"); };
  vi.stubGlobal("fetch", blocked); vi.spyOn(http, "request").mockImplementation(blocked);
  vi.spyOn(https, "request").mockImplementation(blocked); vi.spyOn(net.Socket.prototype, "connect").mockImplementation(blocked);
});
afterEach(() => { expect(network).toBe(0); expect(JSON.stringify(events)).not.toContain(secret); expect(retained.join("\n")).not.toContain(secret); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function scope<T>(run: () => T) { return withAssistantDiagnostics(() => { identifyAssistantDiagnostic(requestId, "openai"); return run(); }); }
const final = () => ({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Wedding guidance", annotations: [] }] }], usage: { input_tokens: 21, output_tokens: 7 } });
const tool = (search = secret) => ({ status: "completed", output: [{ type: "function_call", call_id: "private_call_id", name: "search_marketplace_vendors", arguments: JSON.stringify({ search }) }] });
function provider(...responses: unknown[]) {
  const create = vi.fn(); responses.forEach(response => create.mockResolvedValueOnce(response));
  const instance = new OpenAIWeddingAssistantProvider({ apiKey: secret, model: "test-model" }, () => ({ responses: { create } }));
  const ask = () => scope(() => runWeddingAgent({ message: `Wedding ${secret}`, provider: instance,
    history: buildConversationWindow([{ id: uuid(989), role: "assistant", content: secret, created_at: "2026-09-09T00:00:00Z" }]),
    loadContext: vi.fn().mockRejectedValue(new Error("No eager context")) }));
  return { create, ask };
}
const has = (stage: string, outcome: string, extra = {}) => expect(events).toContainEqual(expect.objectContaining({ stage, outcome, ...extra }));
describe("safe Assistant diagnostic stages", () => {
  it("reproduces Next.js object metadata loss and retains sanitized JSON string metadata", () => {
    const event = { stage: "route" as const, outcome: "failure" as const, code: "AUTH_REQUIRED" as const };
    expect(formatConsoleArgs(["assistant_diagnostic", event])).toBe("assistant_diagnostic {}");
    scope(() => logAssistantDiagnostic(event));
    expect(events[0]).toEqual({ ...event, requestId, provider: "openai", elapsedMs: expect.any(Number) });
    expect(retained[0]).toContain('"code":"AUTH_REQUIRED"');
  });
  it("retains approved tool/count metadata while stripping every private payload from the serialized output", () => {
    scope(() => logAssistantDiagnostic({ stage: "tool_execution", outcome: "success", tool: "search_marketplace_vendors",
      status: "success", round: 2, toolCount: 1, responseCharacters: 120, evidenceCount: 3, inputTokens: 80, outputTokens: 20,
      prompt: secret, history: secret, arguments: secret, results: secret, vendorName: secret, guest: secret, task: secret,
      budget: secret, coupleId: uuid(701), weddingId: uuid(702), userId: uuid(703), profileId: uuid(704), email: secret,
      cookies: secret, authorization: secret, apiKey: secret, rawError: new Error(secret),
      toJSON: () => { throw new Error("Unsafe input must never be stringified"); },
    } as Parameters<typeof logAssistantDiagnostic>[0]));
    expect(events[0]).toEqual({ stage: "tool_execution", outcome: "success", tool: "search_marketplace_vendors",
      status: "success", round: 2, toolCount: 1, responseCharacters: 120, evidenceCount: 3, inputTokens: 80, outputTokens: 20,
      requestId, provider: "openai", elapsedMs: expect.any(Number) });
    for (const id of [701, 702, 703, 704]) expect(retained.join()).not.toContain(uuid(id));
  });
  it("swallows serialization failure without replacing or replaying the response", async () => {
    const stringify = vi.spyOn(JSON, "stringify").mockImplementation(() => { throw new Error(secret); });
    const answer = { status: "ok", text: "Unchanged" };
    const run = vi.fn(async () => { logAssistantDiagnostic({ stage: "route", outcome: "success" }); return answer; });
    let result;
    try { result = await scope(run); } finally { stringify.mockRestore(); }
    expect(result).toBe(answer); expect(run).toHaveBeenCalledOnce(); expect(console.info).not.toHaveBeenCalled();
  });
  it("records ordered general-response stages and safe usage only", async () => {
    expect((await provider(final()).ask()).status).toBe("ok");
    expect(events.map(e => e.stage)).toEqual(["provider", "model_round", "model_round", "model_response_validation", "tool_requested", "final_model_response", "provider_normalization", "attestation", "provider", "response_validation", "response_validation"]);
    has("provider_normalization", "success", { inputTokens: 21, outputTokens: 7 });
    expect(events.every(e => e.requestId === requestId && e.provider === "openai")).toBe(true);
  });
  it.each(["success", "empty", "unavailable"])("records tool %s without arguments/results or identity data", async status => {
    if (status === "unavailable") db.state.errors.add("vendor_profiles");
    const h = provider(tool(status === "empty" ? secret : "Original"), final());
    expect((await h.ask()).status).toBe("ok");
    has("tool_execution", "success", { tool: "search_marketplace_vendors", status });
    has("tool_serialization", "success");
    const logged = JSON.stringify(events);
    for (const value of ["Original Studio", "PRIVATE_SENTINEL", "private_call_id", uuid(1), uuid(10), "arguments", "history", "apiKey"]) expect(logged).not.toContain(value);
  });
  it("distinguishes invalid envelope and argument validation", async () => {
    expect((await provider({ status: "incomplete", output: [] }).ask()).status).toBe("error");
    has("model_response_validation", "failure", { code: "INVALID_PROVIDER_RESULT" });
    events.length = 0;
    await provider({ status: "completed", output: [{ type: "function_call", name: "list_tasks", call_id: "a", arguments: "{" }] }).ask();
    has("tool_arguments", "failure", { code: "INVALID_PROVIDER_RESULT" });
  });
  it("records a deadline without retry or raw errors", async () => {
    vi.useFakeTimers(); const h = provider(); h.create.mockImplementation(() => new Promise(() => {}));
    const pending = h.ask(); await vi.advanceTimersByTimeAsync(30000); expect((await pending).status).toBe("unavailable");
    has("model_round", "failure", { code: "TIMEOUT" }); expect(h.create).toHaveBeenCalledOnce();
  });
  it("normalizes a thrown upstream payload without logging it", async () => {
    const h = provider(); h.create.mockRejectedValue({ message: secret, headers: { authorization: secret }, stack: secret });
    await h.ask(); has("model_round", "failure", { code: "PROVIDER_UNAVAILABLE" });
  });
  it("distinguishes attestation failure", async () => {
    vi.spyOn(trust, "attestToolResponse").mockImplementation(() => { throw new Error(secret); });
    await provider(final()).ask(); has("attestation", "failure");
  });
  it("distinguishes subsequent response validation failure", async () => {
    vi.spyOn(trust, "attestToolResponse").mockImplementation(response => ({ ...response, evidence: [{ kind: "COUPLE_DATA", section: "budget" }] }));
    expect((await provider(final()).ask()).status).toBe("error");
    has("response_validation", "failure", { code: "INVALID_PROVIDER_RESULT" });
  });
  it("drops forbidden fields, unknown strings and invalid correlation identifiers", () => {
    scope(() => {
      identifyAssistantDiagnostic(secret, secret);
      logAssistantDiagnostic({ stage: "route", outcome: "success", prompt: secret, cookie: secret, coupleId: secret } as Parameters<typeof logAssistantDiagnostic>[0]);
      logAssistantDiagnostic({ stage: secret, outcome: "failure", code: secret } as never);
    });
    expect(events).toHaveLength(1); expect(Object.keys(events[0]).sort()).toEqual(["elapsedMs", "outcome", "provider", "requestId", "stage"]);
  });
  it("isolates concurrent scopes", async () => {
    await Promise.all([requestId, uuid(991)].map(id => withAssistantDiagnostics(async () => { identifyAssistantDiagnostic(id, "openai"); await Promise.resolve(); logAssistantDiagnostic({ stage: "route", outcome: "success" }); })));
    expect(events.map(e => e.requestId).sort()).toEqual([requestId, uuid(991)].sort());
  });
  it("cannot change response behavior or replay when the logging sink throws", async () => {
    vi.mocked(console.info).mockImplementation(() => { throw new Error(secret); });
    const h = provider(final()); expect((await h.ask()).status).toBe("ok"); expect(h.create).toHaveBeenCalledOnce();
    const run = vi.fn(() => { throw new Error("original"); }); expect(() => scope(run)).toThrow("original"); expect(run).toHaveBeenCalledOnce();
  });
});
describe("admission diagnostics without a ledger connection", () => {
  const turn = { requestId, coupleId: uuid(1), weddingId: uuid(10), threadId: null, message: `Wedding ${secret}`, language: "en" };
  const channel = () => ({ admit: vi.fn().mockResolvedValue({ status: "admitted", requestId, state: "admitted" }),
    claimDispatch: vi.fn().mockResolvedValue({ status: "dispatch_claimed", requestId, state: "dispatched" }),
    finish: vi.fn().mockResolvedValue({ status: "finished", requestId, state: "completed" }) });
  it("logs admission rejection and no dispatch", async () => {
    const c = channel(); c.admit.mockResolvedValue({ status: "rejected", code: "GLOBAL_QUOTA_EXHAUSTED" });
    await expect(scope(() => prepareAssistantTurn("openai", turn, () => c))).rejects.toMatchObject({ code: "GLOBAL_QUOTA_EXHAUSTED" });
    has("admission", "failure", { code: "GLOBAL_QUOTA_EXHAUSTED" }); expect(c.claimDispatch).not.toHaveBeenCalled();
  });
  it("separates successful provider execution from failed finalization", async () => {
    const c = channel(); c.finish.mockRejectedValue(new Error(secret));
    await expect(scope(async () => { const a = await prepareAssistantTurn("openai", turn, () => c); return a.execute(() => provider(final()).ask()); })).rejects.toMatchObject({ code: "ADMISSION_UNAVAILABLE" });
    has("dispatch_claim", "success"); has("provider", "success"); has("admission_finish", "failure");
  });
  it("preserves Local bypass and result identity with a throwing logger", async () => {
    vi.mocked(console.info).mockImplementation(() => { throw new Error(secret); });
    const load = vi.fn(); const answer = { status: "ok" as const, text: "Unchanged", evidence: [{ kind: "AI_RECOMMENDATION" as const }] };
    const result = await scope(async () => (await prepareAssistantTurn("local", null, load)).execute(async () => answer));
    expect(result).toBe(answer); expect(load).not.toHaveBeenCalled();
  });
});
