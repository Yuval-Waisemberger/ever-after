// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { readFileSync } from "node:fs";
const mocks = vi.hoisted(() => ({ create: vi.fn(), rpc: vi.fn() }));
vi.mock("next/headers", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.create }));
import { getAdmissionChannel } from "@/lib/assistant/guardrails/rpc-channel";
import { prepareAssistantTurn } from "@/lib/assistant/guardrails/execution";
import { guardrailMessages } from "@/lib/assistant/guardrails/contracts";
import { fingerprintRealAiTurn } from "@/lib/assistant/guardrails/server";
import type { AssistantResponse } from "@/lib/assistant/types";

const fixtureKey = "fixture-only-service-role-not-a-credential";
const fixtureUrl = "https://admission-fixture.invalid";
const turn = { requestId: "10000000-0000-4000-8000-000000000001", coupleId: "20000000-0000-4000-8000-000000000001",
  weddingId: "30000000-0000-4000-8000-000000000001", threadId: null, message: "Our wedding budget?", language: "en" };
const identity = { requestId: turn.requestId, coupleId: turn.coupleId };
const answer: AssistantResponse = { status: "ok", text: "Wedding guidance", evidence: [{ kind: "AI_RECOMMENDATION" }] };
let networkAttempts: number;
beforeEach(() => {
  vi.clearAllMocks(); networkAttempts = 0;
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
  const blocked = () => { networkAttempts++; throw new Error("External network forbidden"); };
  vi.stubGlobal("fetch", vi.fn(blocked)); vi.spyOn(http, "request").mockImplementation(blocked);
  vi.spyOn(https, "request").mockImplementation(blocked); vi.spyOn(net.Socket.prototype, "connect").mockImplementation(blocked);
  mocks.create.mockReset().mockReturnValue({ rpc: mocks.rpc, from: vi.fn() });
  mocks.rpc.mockReset().mockImplementation(async (name: string, args: Record<string, string>) => ({ error: null,
    data: name === "admit_assistant_real_ai_turn" ? { status: "admitted", requestId: turn.requestId, state: "admitted" }
      : name === "claim_assistant_real_ai_dispatch" ? { status: "dispatch_claimed", requestId: turn.requestId, state: "dispatched" }
      : { status: "finished", requestId: turn.requestId, state: args.p_outcome_code === "SUCCEEDED" ? "completed" : args.p_outcome_code === "EXECUTION_UNCERTAIN" ? "uncertain" : "failed" },
  }));
});
afterEach(() => {
  try { expect(networkAttempts).toBe(0); } finally { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
});
function configured() { vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", fixtureKey); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", fixtureUrl); }

describe("lazy dedicated admission client", () => {
  it("constructs nothing when the module is freshly imported", async () => {
    configured(); vi.resetModules();
    await import("@/lib/assistant/guardrails/rpc-channel");
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not initialize at import or read credentials until explicitly requested", async () => {
    expect(mocks.create).not.toHaveBeenCalled();
    const env: NodeJS.ProcessEnv = { NODE_ENV: "test" };
    Object.defineProperty(env, "SUPABASE_SERVICE_ROLE_KEY", { get() { throw new Error("Local must not read this variable"); } });
    const spy = vi.spyOn(process, "env", "get").mockReturnValue(env);
    try {
      const local = await prepareAssistantTurn("local", null);
      expect(await local.execute(async () => answer)).toBe(answer); await local.failBeforeDispatch();
      expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
  it.each([undefined, "", "   ", "two words", "a".repeat(4097)])("fails closed with missing/invalid credential case %#", async key => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", fixtureUrl); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", key);
    expect(getAdmissionChannel).toThrow(/^Admission unavailable$/);
    await expect(prepareAssistantTurn("openai", turn)).rejects.toMatchObject({ code: "ADMISSION_UNAVAILABLE", message: guardrailMessages.ADMISSION_UNAVAILABLE });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "not-a-url", "http://example.invalid", "https://user:password@example.invalid", "https://example.invalid/path", "https://example.invalid?key=hidden", "https://example.invalid#fragment"])("fails closed with invalid project URL case %#", url => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", fixtureKey); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    expect(getAdmissionChannel).toThrow(/^Admission unavailable$/); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("constructs lazily with disabled session behavior and retries; exposes only the existing three-operation adapter", async () => {
    configured(); expect(mocks.create).not.toHaveBeenCalled();
    const channel = getAdmissionChannel();
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith(fixtureUrl, fixtureKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, db: { retry: false },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(Object.keys(channel).sort()).toEqual(["admit", "claimDispatch", "finish"]);
    for (const name of ["rpc", "from", "client", "auth", "key", "sql", "select", "insert"]) expect(channel).not.toHaveProperty(name);
    await channel.admit({ ...identity, weddingId: turn.weddingId, digest: "a".repeat(64) });
    await channel.claimDispatch(identity); await channel.finish({ ...identity, outcome: "EXECUTION_UNCERTAIN" });
    expect(mocks.rpc.mock.calls).toEqual([
      ["admit_assistant_real_ai_turn", { p_request_id: turn.requestId, p_couple_id: turn.coupleId, p_wedding_id: turn.weddingId, p_request_digest: "a".repeat(64) }],
      ["claim_assistant_real_ai_dispatch", { p_request_id: turn.requestId, p_couple_id: turn.coupleId }],
      ["finish_assistant_real_ai_turn", { p_request_id: turn.requestId, p_couple_id: turn.coupleId, p_outcome_code: "EXECUTION_UNCERTAIN" }],
    ]);
  });
  it("normalizes constructor failures without returning credentials or raw error causes", () => {
    configured(); mocks.create.mockImplementation(() => { throw new Error(fixtureKey); });
    try { getAdmissionChannel(); expect.fail("Expected safe failure"); } catch (error) {
      expect(error).toMatchObject({ message: "Admission unavailable" });
      expect(JSON.stringify(error)).not.toContain(fixtureKey); expect(error).not.toHaveProperty("cause");
    }
  });
  it("does not reuse the normal authenticated cookie client", () => {
    const source = readFileSync("src/lib/assistant/guardrails/rpc-channel.ts", "utf8");
    expect(source).toContain('import "next/headers"'); expect(source).toContain('from "@supabase/supabase-js"');
    expect(source).not.toMatch(/supabase\/server|@supabase\/ssr|cookies\(|\.from\(|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe("configured mocked admission lifecycle", () => {
  it("uses one private client for admission, single claim and completion, preserving the server digest", async () => {
    configured(); const admitted = await prepareAssistantTurn("openai", turn);
    const run = vi.fn().mockResolvedValue(answer); expect(await admitted.execute(run)).toBe(answer);
    expect(mocks.create).toHaveBeenCalledOnce(); expect(mocks.rpc).toHaveBeenCalledTimes(3); expect(run).toHaveBeenCalledOnce();
    expect(mocks.rpc.mock.calls[0][1].p_request_digest).toBe(fingerprintRealAiTurn(turn));
    await expect(admitted.execute(run)).rejects.toMatchObject({ code: "INVALID_TRANSITION" }); expect(run).toHaveBeenCalledOnce();
  });
  it.each(["GLOBAL_QUOTA_EXHAUSTED", "COUPLE_QUOTA_EXHAUSTED", "REQUEST_ACTIVE", "REQUEST_CONFLICT"])("preserves SQL admission rejection %s without dispatch", async code => {
    configured(); mocks.rpc.mockResolvedValue({ data: { status: "rejected", code }, error: null });
    await expect(prepareAssistantTurn("openai", turn)).rejects.toMatchObject({ code }); expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it("preserves terminal uncertain finalization without a retry, refund or subsequent execution", async () => {
    configured(); const admission = await prepareAssistantTurn("openai", turn);
    const run = vi.fn().mockRejectedValue(new Error("Ambiguous provider outcome"));
    await expect(admission.execute(run)).rejects.toMatchObject({ code: "ADMISSION_UNAVAILABLE" });
    expect(mocks.rpc.mock.calls[2]).toEqual(["finish_assistant_real_ai_turn", { p_request_id: turn.requestId, p_couple_id: turn.coupleId, p_outcome_code: "EXECUTION_UNCERTAIN" }]);
    await expect(admission.execute(run)).rejects.toMatchObject({ code: "INVALID_TRANSITION" }); expect(run).toHaveBeenCalledOnce();
  });
  it.each(["admit", "claimDispatch", "finish"] as const)("normalizes returned and thrown %s errors with no retry", async operation => {
    configured(); const channel = getAdmissionChannel();
    const invoke = () => operation === "admit" ? channel.admit({ ...identity, weddingId: turn.weddingId, digest: "a".repeat(64) })
      : operation === "claimDispatch" ? channel.claimDispatch(identity) : channel.finish({ ...identity, outcome: "SUCCEEDED" });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: fixtureKey, headers: { authorization: fixtureKey } } });
    await expect(invoke()).rejects.toThrow(/^Admission unavailable$/); expect(mocks.rpc).toHaveBeenCalledTimes(1);
    mocks.rpc.mockRejectedValueOnce(new Error(fixtureKey));
    await expect(invoke()).rejects.toThrow(/^Admission unavailable$/); expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it("makes one fake HTTP attempt with the real installed SDK on a transient RPC failure", async () => {
    configured();
    const sdk = await vi.importActual<typeof import("@supabase/supabase-js")>("@supabase/supabase-js");
    const transport = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ message: "fixture transport failure" }), {
      status: 503, headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", transport); mocks.create.mockImplementation(sdk.createClient);
    await expect(getAdmissionChannel().claimDispatch(identity)).rejects.toThrow(/^Admission unavailable$/);
    expect(transport).toHaveBeenCalledOnce();
    expect(String(transport.mock.calls[0]?.[0])).toContain("admission-fixture.invalid/rest/v1/rpc/claim_assistant_real_ai_dispatch");
  });
  it("retains committed SQL cap and active-slot definitions without a short-window limiter", () => {
    const sql = readFileSync("supabase/migrations/202609080001_assistant_real_ai_admission.sql", "utf8");
    expect(sql).toContain(") >= 500"); expect(sql).toContain(") >= 150");
    expect(sql).toContain("where state in ('admitted', 'dispatched')");
    expect(sql).not.toMatch(/interval\s+'5|RATE_LIMIT|rate_limited|count\(\*\).*admitted_at/i);
  });
});
