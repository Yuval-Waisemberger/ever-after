import "next/headers";
import type { AssistantResponse } from "../types";
import { guardrailCode, guardrailMessages, realAiTurnSchema } from "./contracts";
import { createRealAiGuardrails, type AdmissionChannel } from "./server";
import { getAdmissionChannel } from "./rpc-channel";

type Code = keyof typeof guardrailMessages;
export class AssistantAdmissionError extends Error {
  readonly code: Code;
  readonly httpStatus: number;
  constructor(rawCode: unknown) {
    const code = guardrailCode.safeParse(rawCode);
    const safeCode = code.success ? code.data : "ADMISSION_UNAVAILABLE";
    super(guardrailMessages[safeCode]);
    this.code = safeCode;
    this.httpStatus = ["GLOBAL_QUOTA_EXHAUSTED", "COUPLE_QUOTA_EXHAUSTED"].includes(safeCode) ? 429
      : ["REQUEST_ACTIVE", "REQUEST_CONFLICT", "INVALID_TRANSITION"].includes(safeCode) ? 409
      : safeCode === "INVALID_INPUT" ? 400 : safeCode === "NOT_AUTHORIZED" ? 403 : 503;
  }
}

export interface AssistantTurnAdmission {
  failBeforeDispatch(): Promise<void>;
  execute(run: () => Promise<AssistantResponse>): Promise<AssistantResponse>;
}

/** Called only after authentication, owned-wedding and existing-thread checks.
 * Only Local is registered today. No external provider/configuration is enabled.
 * The injectable channel supports isolated tests and the later approved RPC client. */
export async function prepareAssistantTurn(
  providerName: string, raw: unknown, loadChannel: () => AdmissionChannel = getAdmissionChannel,
): Promise<AssistantTurnAdmission> {
  // No validation, credential lookup, connection or ledger call in Local mode.
  if (providerName === "local") return { failBeforeDispatch: async () => {}, execute: (run) => run() };
  if (providerName !== "openai") throw new AssistantAdmissionError("ADMISSION_UNAVAILABLE");
  const parsed = realAiTurnSchema.safeParse(raw);
  if (!parsed.success) throw new AssistantAdmissionError("INVALID_INPUT");
  let channel: AdmissionChannel;
  try { channel = loadChannel(); } catch { throw new AssistantAdmissionError("ADMISSION_UNAVAILABLE"); }
  const guard = createRealAiGuardrails(channel);
  const admitted = await guard.admit("openai", parsed.data);
  if (admitted.status === "rejected") throw new AssistantAdmissionError(admitted.code);
  // No takeover/replay, even if an earlier caller left an admitted row behind.
  if (admitted.status !== "admitted") throw new AssistantAdmissionError("INVALID_TRANSITION");
  const identity = { requestId: parsed.data.requestId, coupleId: parsed.data.coupleId };
  let canClaim = true;
  return {
    async failBeforeDispatch() {
      if (!canClaim) return;
      canClaim = false;
      const result = await guard.finish({ ...identity, outcome: "PRE_DISPATCH_FAILED" });
      if (result.status === "rejected") throw new AssistantAdmissionError(result.code);
    },
    async execute(run) {
      if (!canClaim) throw new AssistantAdmissionError("INVALID_TRANSITION");
      canClaim = false;
      const claim = await guard.claimDispatch(identity);
      // A lost claim reply never authorizes dispatch; no automatic RPC retry.
      if (claim.status === "rejected") throw new AssistantAdmissionError(claim.code);
      let response: AssistantResponse;
      try { response = await run(); }
      catch {
        await guard.finish({ ...identity, outcome: "EXECUTION_UNCERTAIN" });
        throw new AssistantAdmissionError("ADMISSION_UNAVAILABLE");
      }
      // Existing orchestration normalizes provider failures. Without trustworthy
      // dispatch metadata, conservatively count them as terminal uncertain.
      const outcome = response.status === "error" || response.status === "unavailable" ? "EXECUTION_UNCERTAIN" : "SUCCEEDED";
      const finished = await guard.finish({ ...identity, outcome });
      if (finished.status === "rejected") throw new AssistantAdmissionError(finished.code);
      return response;
    },
  };
}
