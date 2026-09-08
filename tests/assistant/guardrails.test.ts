// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({}));
import { createRealAiGuardrails, fingerprintRealAiTurn, type AdmissionChannel } from "@/lib/assistant/guardrails/server";
import { REAL_AI_LIMITS, guardrailCode, guardrailMessages } from "@/lib/assistant/guardrails/contracts";
import { getWeddingAssistantProvider } from "@/lib/assistant/provider";
import { runWeddingAgent } from "@/lib/assistant/agent";
import { assistantContext } from "./fixtures";

const requestId = "10000000-0000-4000-8000-000000000001";
const turn = { requestId, coupleId: "20000000-0000-4000-8000-000000000001", weddingId: "30000000-0000-4000-8000-000000000001", threadId: null, message: "What tasks do we have?", language: "en" };
const channel = () => ({ admit: vi.fn(), claimDispatch: vi.fn(), finish: vi.fn() } satisfies AdmissionChannel);

describe("future real AI admission contract", () => {
  it("retains the approved fixed policy", () => {
    expect(REAL_AI_LIMITS).toEqual({ globalTurns: 500, coupleTurns: 150, windowTurns: 10, windowSeconds: 300, activePerCouple: 1 });
    expect(Object.isFrozen(REAL_AI_LIMITS)).toBe(true);
  });
  it("fingerprints canonical semantics without depending on object order or request UUID", () => {
    expect(fingerprintRealAiTurn({ ...turn, message: ` ${turn.message} ` })).toBe(fingerprintRealAiTurn(turn));
    expect(fingerprintRealAiTurn({ ...turn, requestId: crypto.randomUUID() })).toBe(fingerprintRealAiTurn(turn));
    expect(fingerprintRealAiTurn({ language: turn.language, message: turn.message, threadId: null, weddingId: turn.weddingId, coupleId: turn.coupleId, requestId })).toBe(fingerprintRealAiTurn(turn));
    for (const changed of [{ message: "A different question" }, { language: "he" }, { threadId: requestId }, { coupleId: requestId }, { weddingId: requestId }]) {
      expect(fingerprintRealAiTurn({ ...turn, ...changed })).not.toBe(fingerprintRealAiTurn(turn));
    }
    expect(fingerprintRealAiTurn(turn)).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprintRealAiTurn({ ...turn, message: "מה התקציב שלנו?" })).toHaveLength(64);
  });
  it("sends only minimized fields to the database channel", async () => {
    const db = channel(); db.admit.mockResolvedValue({ status: "admitted", requestId, state: "admitted" });
    expect(await createRealAiGuardrails(db).admit("openai", turn)).toEqual({ status: "admitted", requestId, state: "admitted" });
    expect(db.admit).toHaveBeenCalledWith({ requestId, coupleId: turn.coupleId, weddingId: turn.weddingId, digest: fingerprintRealAiTurn(turn) });
    expect(JSON.stringify(db.admit.mock.calls)).not.toContain(turn.message);
    expect(JSON.stringify(db.admit.mock.calls)).not.toContain("threadId");
  });
  it.each([{}, { ...turn, requestId: "forged" }, { ...turn, message: "" }, { ...turn, message: "a".repeat(3001) }, { ...turn, globalCap: 999 }, { ...turn, admittedAt: "2020-01-01" }])("rejects invalid/extra inputs without a database call", async input => {
    const db = channel(); expect(await createRealAiGuardrails(db).admit("openai", input)).toEqual({ status: "rejected", code: "INVALID_INPUT" });
    expect(db.admit).not.toHaveBeenCalled();
  });
  it("passes existing identity/state without granting dispatch or replaying anything", async () => {
    const db = channel(); db.admit.mockResolvedValue({ status: "existing", requestId, state: "completed" });
    expect(await createRealAiGuardrails(db).admit("openai", turn)).toEqual({ status: "existing", requestId, state: "completed" });
    expect(db.claimDispatch).not.toHaveBeenCalled(); expect(db.finish).not.toHaveBeenCalled();
  });
  it("validates single dispatch claims and explicit completion states", async () => {
    const db = channel(); const guard = createRealAiGuardrails(db), identity = { requestId, coupleId: turn.coupleId };
    db.claimDispatch.mockResolvedValue({ status: "dispatch_claimed", requestId, state: "dispatched" });
    expect((await guard.claimDispatch(identity)).status).toBe("dispatch_claimed");
    for (const [outcome, state] of [["SUCCEEDED", "completed"], ["PRE_DISPATCH_FAILED", "failed"], ["PROVIDER_FAILED", "failed"], ["EXECUTION_UNCERTAIN", "uncertain"]]) {
      db.finish.mockResolvedValue({ status: "finished", requestId, state });
      expect(await guard.finish({ ...identity, outcome })).toEqual({ status: "finished", requestId, state });
    }
    expect(await guard.finish({ ...identity, outcome: "raw provider error" })).toEqual({ status: "rejected", code: "INVALID_INPUT" });
    db.finish.mockResolvedValue({ status: "finished", requestId, state: "completed" });
    expect(await guard.finish({ ...identity, outcome: "EXECUTION_UNCERTAIN" })).toEqual({ status: "rejected", code: "ADMISSION_UNAVAILABLE" });
  });
  it("normalizes database errors, invalid results and mismatched identities without retry", async () => {
    const db = channel(), guard = createRealAiGuardrails(db), identity = { requestId, coupleId: turn.coupleId };
    for (const value of [null, { status: "admitted", requestId, state: "completed" }, { status: "admitted", requestId: turn.coupleId, state: "admitted" }, { status: "rejected", code: "RATE_LIMITED", rawError: "secret" }]) {
      db.admit.mockResolvedValue(value);
      expect(await guard.admit("openai", turn)).toEqual({ status: "rejected", code: "ADMISSION_UNAVAILABLE" });
    }
    db.admit.mockRejectedValue(new Error("private database credential"));
    db.claimDispatch.mockRejectedValue(new Error("uncertain connection outcome"));
    db.finish.mockRejectedValue(new Error("private response"));
    expect(await guard.admit("openai", turn)).toEqual({ status: "rejected", code: "ADMISSION_UNAVAILABLE" });
    expect(await guard.claimDispatch(identity)).toEqual({ status: "rejected", code: "ADMISSION_UNAVAILABLE" });
    expect(await guard.finish({ ...identity, outcome: "SUCCEEDED" })).toEqual({ status: "rejected", code: "ADMISSION_UNAVAILABLE" });
    expect(db.claimDispatch).toHaveBeenCalledTimes(1); expect(db.finish).toHaveBeenCalledTimes(1);
  });
  it("provides only fixed safe error copy", () => {
    for (const code of guardrailCode.options) expect(guardrailMessages[code]).toBeTruthy();
  });
  it("exempts Local before input validation and leaves current Local generation unchanged", async () => {
    const db = channel();
    expect(await createRealAiGuardrails(db).admit("local", null)).toEqual({ status: "not_required" });
    const response = await runWeddingAgent({ message: "Which vendors have we booked?", provider: getWeddingAssistantProvider("local"), loadContext: async () => assistantContext() });
    expect(response.status).toBe("ok");
    expect(db.admit).not.toHaveBeenCalled(); expect(db.claimDispatch).not.toHaveBeenCalled(); expect(db.finish).not.toHaveBeenCalled();
    for (const file of ["src/app/api/assistant/route.ts", "src/lib/assistant/provider.ts", "src/lib/assistant/agent.ts", "src/lib/assistant/local-provider.ts"]) {
      expect(readFileSync(file, "utf8")).not.toContain("guardrails");
    }
  });
});
