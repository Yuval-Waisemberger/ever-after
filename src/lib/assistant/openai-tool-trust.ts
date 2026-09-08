import "next/headers";
import type { AssistantResponse } from "./types";
import type { AgentEvidence } from "./evidence";
import type { AssistantReadToolName } from "./tools/registry";

export type TurnToolRecord = {
  callId: string; name: AssistantReadToolName; fingerprint: string;
  execution: "executed" | "cached";
  resultStatus: "success" | "empty" | "unavailable";
  evidence: AgentEvidence[];
};

// Object identity cannot arrive from JSON, history, or model output. Keep the proof
// server-only and ephemeral; no raw results, reasoning or ledger is returned to UI.
const verifiedResponses = new WeakMap<object, string>();
function claims(response: AssistantResponse) {
  return JSON.stringify({ evidence: response.evidence, toolUsage: response.toolUsage });
}
export function attestToolResponse(response: AssistantResponse, ledger: readonly TurnToolRecord[]): AssistantResponse {
  const evidence: AgentEvidence[] = [{ kind: "AI_RECOMMENDATION" }];
  for (const record of ledger) for (const item of record.evidence) {
    if (!evidence.some(existing => JSON.stringify(existing) === JSON.stringify(item))) evidence.push(item);
  }
  response.evidence = evidence;
  if (ledger.length) response.toolUsage = ledger.map(record => ({ name: record.name, callId: record.callId,
    status: record.resultStatus === "unavailable" ? "unavailable" : "succeeded" }));
  verifiedResponses.set(response, claims(response));
  return response;
}
export function hasVerifiedToolClaims(input: unknown): boolean {
  return typeof input === "object" && input !== null && verifiedResponses.has(input)
    && verifiedResponses.get(input) === claims(input as AssistantResponse);
}
