// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({}));
import { AssistantAdmissionError, prepareAssistantTurn } from "@/lib/assistant/guardrails/execution";
import { createAdmissionRpcChannel, getAdmissionChannel } from "@/lib/assistant/guardrails/rpc-channel";
import { fingerprintRealAiTurn } from "@/lib/assistant/guardrails/server";
import { guardrailCode, guardrailMessages } from "@/lib/assistant/guardrails/contracts";
import { assistantRequestSchema } from "@/lib/validation/assistant";
import type { AssistantResponse } from "@/lib/assistant/types";

const turn = { requestId: "10000000-0000-4000-8000-000000000001", coupleId: "20000000-0000-4000-8000-000000000001", weddingId: "30000000-0000-4000-8000-000000000001", threadId: null, message: "Our wedding budget?", language: "en" };
const identity = { requestId: turn.requestId, coupleId: turn.coupleId };
const answer: AssistantResponse = { status: "ok", text: "A safe answer", evidence: [{ kind: "AI_RECOMMENDATION" }] };
const database = () => ({
  admit: vi.fn().mockResolvedValue({ status: "admitted", requestId: turn.requestId, state: "admitted" }),
  claimDispatch: vi.fn().mockResolvedValue({ status: "dispatch_claimed", requestId: turn.requestId, state: "dispatched" }),
  finish: vi.fn().mockImplementation(async ({ outcome }: { outcome: string }) => ({ status: "finished", requestId: turn.requestId, state: outcome === "SUCCEEDED" ? "completed" : outcome === "EXECUTION_UNCERTAIN" ? "uncertain" : "failed" })),
});

describe("dormant admission execution boundary", () => {
  it("does not even load a channel for Local, including legacy requests", async () => {
    const load = vi.fn(() => { throw new Error("No credentials"); });
    const local = await prepareAssistantTurn("local", null, load);
    const run = vi.fn().mockResolvedValue(answer);
    expect(await local.execute(run)).toBe(answer);
    await local.failBeforeDispatch();
    expect(load).not.toHaveBeenCalled(); expect(run).toHaveBeenCalledTimes(1);
  });
  it("fails closed without a configured privileged channel; unknown providers cannot dispatch", async () => {
    expect(getAdmissionChannel).toThrow("Admission unavailable");
    await expect(prepareAssistantTurn("openai", turn)).rejects.toMatchObject({ code: "ADMISSION_UNAVAILABLE" });
    const load = vi.fn(database);
    await expect(prepareAssistantTurn("unregistered", turn, load)).rejects.toMatchObject({ code: "ADMISSION_UNAVAILABLE" });
    await expect(prepareAssistantTurn("openai", { ...turn, requestId: undefined }, load)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(load).not.toHaveBeenCalled();
  });
  it("requires admission then committed claim before executing, then records success", async () => {
    const db = database(); const admitted = await prepareAssistantTurn("openai", turn, () => db);
    const run = vi.fn(async () => {
      expect(db.admit).toHaveBeenCalledTimes(1); expect(db.claimDispatch).toHaveBeenCalledTimes(1);
      expect(db.finish).not.toHaveBeenCalled(); return answer;
    });
    expect(await admitted.execute(run)).toBe(answer);
    expect(db.admit).toHaveBeenCalledWith({ ...identity, weddingId: turn.weddingId, digest: fingerprintRealAiTurn(turn) });
    expect(db.finish).toHaveBeenCalledWith({ ...identity, outcome: "SUCCEEDED" });
    await expect(admitted.execute(run)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await admitted.failBeforeDispatch(); expect(db.finish).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it.each(["admitted", "dispatched", "completed", "failed", "uncertain"])("does not take over/replay an existing %s request", async state => {
    const db = database(); db.admit.mockResolvedValue({ status: "existing", requestId: turn.requestId, state });
    await expect(prepareAssistantTurn("openai", turn, () => db)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(db.claimDispatch).not.toHaveBeenCalled(); expect(db.finish).not.toHaveBeenCalled();
  });
  it("retains known pre-dispatch failure without permitting dispatch or a second transition", async () => {
    const db = database(); const admitted = await prepareAssistantTurn("openai", turn, () => db);
    await admitted.failBeforeDispatch(); await admitted.failBeforeDispatch();
    expect(db.finish).toHaveBeenCalledExactlyOnceWith({ ...identity, outcome: "PRE_DISPATCH_FAILED" });
    const run = vi.fn(); await expect(admitted.execute(run)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(run).not.toHaveBeenCalled(); expect(db.claimDispatch).not.toHaveBeenCalled();
  });
  it("records ambiguous execution once as uncertain and never retries or refunds", async () => {
    const db = database(); const admitted = await prepareAssistantTurn("openai", turn, () => db);
    const run = vi.fn().mockRejectedValue(new Error("secret provider timeout"));
    await expect(admitted.execute(run)).rejects.toMatchObject({ code: "ADMISSION_UNAVAILABLE" });
    expect(db.finish).toHaveBeenCalledExactlyOnceWith({ ...identity, outcome: "EXECUTION_UNCERTAIN" });
    await expect(admitted.execute(run)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(run).toHaveBeenCalledTimes(1); expect(db.admit).toHaveBeenCalledTimes(1);
  });
  it("treats normalized orchestration failures conservatively and rejects lost finish replies", async () => {
    const db = database(); const admitted = await prepareAssistantTurn("openai", turn, () => db);
    const unavailable: AssistantResponse = { status: "unavailable", text: "Unavailable", evidence: [], error: { code: "PROVIDER_UNAVAILABLE", retryable: false } };
    expect(await admitted.execute(async () => unavailable)).toBe(unavailable);
    expect(db.finish).toHaveBeenCalledExactlyOnceWith({ ...identity, outcome: "EXECUTION_UNCERTAIN" });
    const second = await prepareAssistantTurn("openai", turn, () => db);
    db.finish.mockRejectedValue(new Error("private SQL"));
    await expect(second.execute(async () => answer)).rejects.toMatchObject({ code: "ADMISSION_UNAVAILABLE" });
    expect(db.finish).toHaveBeenCalledTimes(2);
  });
  it("never executes on an ambiguous dispatch-claim reply", async () => {
    const db = database(); db.claimDispatch.mockRejectedValue(new Error("commit reply lost"));
    const admitted = await prepareAssistantTurn("openai", turn, () => db), run = vi.fn();
    await expect(admitted.execute(run)).rejects.toMatchObject({ code: "ADMISSION_UNAVAILABLE" });
    await admitted.failBeforeDispatch();
    expect(run).not.toHaveBeenCalled(); expect(db.claimDispatch).toHaveBeenCalledTimes(1); expect(db.finish).not.toHaveBeenCalled();
  });
  it.each(guardrailCode.options)("normalizes %s without internal database information", async code => {
    const db = database(); db.admit.mockResolvedValue({ status: "rejected", code });
    await expect(prepareAssistantTurn("openai", turn, () => db)).rejects.toMatchObject({ code, message: guardrailMessages[code] });
    expect(db.claimDispatch).not.toHaveBeenCalled();
  });
  it("maps unknown errors to safe application copy/status", () => {
    expect(new AssistantAdmissionError("private SQL details")).toMatchObject({ code: "ADMISSION_UNAVAILABLE", httpStatus: 503, message: guardrailMessages.ADMISSION_UNAVAILABLE });
    expect(new AssistantAdmissionError("RATE_LIMITED").httpStatus).toBe(429);
    expect(new AssistantAdmissionError("REQUEST_CONFLICT").httpStatus).toBe(409);
  });
});

describe("request transport and server-only RPC contract", () => {
  it("accepts stable UUIDs, rejects invalid identities and drops client authority/digests", () => {
    expect(assistantRequestSchema.parse({ message: "  Our tasks?  ", requestId: turn.requestId, digest: "forged", coupleId: "forged" })).toEqual({ message: "Our tasks?", requestId: turn.requestId });
    expect(assistantRequestSchema.safeParse({ message: "Our tasks?", requestId: "invalid" }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ message: "Our tasks?" }).success).toBe(true);
  });
  it("exposes exactly three RPC calls with minimized arguments and no raw error", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { result: "test" }, error: null });
    const channel = createAdmissionRpcChannel({ rpc });
    await channel.admit({ ...identity, weddingId: turn.weddingId, digest: "a".repeat(64) });
    await channel.claimDispatch(identity); await channel.finish({ ...identity, outcome: "EXECUTION_UNCERTAIN" });
    expect(rpc.mock.calls).toEqual([
      ["admit_assistant_real_ai_turn", { p_request_id: turn.requestId, p_couple_id: turn.coupleId, p_wedding_id: turn.weddingId, p_request_digest: "a".repeat(64) }],
      ["claim_assistant_real_ai_dispatch", { p_request_id: turn.requestId, p_couple_id: turn.coupleId }],
      ["finish_assistant_real_ai_turn", { p_request_id: turn.requestId, p_couple_id: turn.coupleId, p_outcome_code: "EXECUTION_UNCERTAIN" }],
    ]);
    rpc.mockResolvedValue({ data: null, error: { message: "private SQL details" } });
    await expect(channel.claimDispatch(identity)).rejects.toThrow(/^Admission unavailable$/);
  });
  it("keeps server modules out of presentation/schema imports and uses Next's server boundary", () => {
    for (const file of ["server", "rpc-channel", "execution"]) {
      const source = readFileSync(`src/lib/assistant/guardrails/${file}.ts`, "utf8");
      expect(source).toContain('import "next/headers"');
      expect(source).not.toContain("process.env");
    }
    for (const file of ["src/components/assistant/assistant-chat.tsx", "src/lib/validation/assistant.ts", "src/lib/assistant/guardrails/contracts.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/guardrails\/(?:server|execution|rpc-channel)|process\.env|node:crypto|supabase\/server/);
    }
  });
});
