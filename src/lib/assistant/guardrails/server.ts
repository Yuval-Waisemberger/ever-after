// Next's server dependency prevents this module from entering a Client Component.
import "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import { admissionIdentitySchema, admitResultSchema, dispatchResultSchema, finishResultSchema, realAiTurnSchema, terminalOutcome, type guardrailCode } from "./contracts";

// No connection/credential implementation exists in Phase 1A. Later this channel
// must return ONLY AFTER its narrow database transaction has committed.
export interface AdmissionChannel {
  admit(input: { requestId: string; coupleId: string; weddingId: string; digest: string }): Promise<unknown>;
  claimDispatch(input: z.output<typeof admissionIdentitySchema>): Promise<unknown>;
  finish(input: z.output<typeof admissionIdentitySchema> & { outcome: z.output<typeof terminalOutcome> }): Promise<unknown>;
}
const reject = (code: z.output<typeof guardrailCode>) => ({ status: "rejected" as const, code });

export function fingerprintRealAiTurn(raw: unknown) {
  const turn = realAiTurnSchema.parse(raw);
  // Versioned deterministic serialization, no raw message retained in the ledger.
  // A digest is NOT authorization or a claim of PII anonymization.
  return createHash("sha256").update(JSON.stringify([
    "ever-after-real-ai-v1", turn.coupleId, turn.weddingId, turn.threadId, turn.message, turn.language,
  ])).digest("hex");
}

export function createRealAiGuardrails(channel: AdmissionChannel) {
  return {
    async admit(provider: "local" | "openai", raw: unknown) {
      // Provider MUST be selected by trusted server configuration, never the client.
      if (provider === "local") return { status: "not_required" as const };
      if (provider !== "openai") return reject("INVALID_INPUT");
      const parsed = realAiTurnSchema.safeParse(raw);
      if (!parsed.success) return reject("INVALID_INPUT");
      const { requestId, coupleId, weddingId } = parsed.data;
      try {
        const result = admitResultSchema.parse(await channel.admit({ requestId, coupleId, weddingId, digest: fingerprintRealAiTurn(parsed.data) }));
        if (result.status !== "rejected" && result.requestId !== requestId) return reject("ADMISSION_UNAVAILABLE");
        return result;
      } catch { return reject("ADMISSION_UNAVAILABLE"); }
    },
    async claimDispatch(raw: unknown) {
      const parsed = admissionIdentitySchema.safeParse(raw);
      if (!parsed.success) return reject("INVALID_INPUT");
      try {
        const result = dispatchResultSchema.parse(await channel.claimDispatch(parsed.data));
        if (result.status !== "rejected" && result.requestId !== parsed.data.requestId) return reject("ADMISSION_UNAVAILABLE");
        return result;
      } catch { return reject("ADMISSION_UNAVAILABLE"); }
    },
    async finish(raw: unknown) {
      const parsed = admissionIdentitySchema.extend({ outcome: terminalOutcome }).safeParse(raw);
      if (!parsed.success) return reject("INVALID_INPUT");
      try {
        const result = finishResultSchema.parse(await channel.finish(parsed.data));
        const expected = parsed.data.outcome === "SUCCEEDED" ? "completed" : parsed.data.outcome === "EXECUTION_UNCERTAIN" ? "uncertain" : "failed";
        if (result.status !== "rejected" && (result.requestId !== parsed.data.requestId || result.state !== expected)) return reject("ADMISSION_UNAVAILABLE");
        return result;
      } catch { return reject("ADMISSION_UNAVAILABLE"); }
    },
  };
}
