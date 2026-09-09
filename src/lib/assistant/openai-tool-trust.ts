import "next/headers";
import type { AssistantResponse } from "./types";
import type { AgentEvidence } from "./evidence";
import { isResearchReceipt, type ResearchReceipt } from "./research/server";
import type { AssistantReadToolName } from "./tools/registry";

export type TurnToolRecord = {
  callId: string; name: AssistantReadToolName | ResearchReceipt["tool"]; fingerprint: string;
  execution: "executed" | "cached";
  resultStatus: "success" | "empty" | "unavailable" | "partial" | "insufficient_evidence";
  evidence: AgentEvidence[];
};

// Object identity cannot arrive from JSON, history, or model output. Keep the proof
// server-only and ephemeral; no raw results, reasoning or ledger is returned to UI.
const verifiedResponses = new WeakMap<object, string>();
function claims(response: AssistantResponse) {
  return JSON.stringify({ text: response.text, evidence: response.evidence, toolUsage: response.toolUsage });
}
export function attestToolResponse(response: AssistantResponse, ledger: readonly TurnToolRecord[], receipts: readonly ResearchReceipt[] = []): AssistantResponse {
  const evidence: AgentEvidence[] = [{ kind: "AI_RECOMMENDATION" }];
  for (const record of ledger) for (const item of record.evidence) {
    if (item.kind === "EXTERNAL_CURRENT_EVIDENCE") throw new Error("Research requires a separate receipt.");
    if (!evidence.some(existing => JSON.stringify(existing) === JSON.stringify(item))) evidence.push(item);
  }
  const urls = new Set<string>();
  for (const receipt of receipts) {
    if (!isResearchReceipt(receipt)) throw new Error("Unverified research receipt.");
    const result = receipt.result;
    if (result.status !== "success" && result.status !== "partial") continue;
    const findings = "findings" in result.data ? result.data.findings : result.data.pricingFactors;
    const used = new Set(findings.flatMap(finding => finding.sourceIds));
    if ("observedRange" in result.data) for (const range of [result.data.observedRange, result.data.typicalRange]) range?.sourceIds.forEach(id => used.add(id));
    const sources = result.sources.filter(source => used.has(source.sourceId));
    sources.forEach(source => urls.add(source.url));
    if (sources.length) evidence.push({ kind: "EXTERNAL_CURRENT_EVIDENCE", sources: sources.map(({ origin: _origin, benchmarkContext: _benchmark, ...source }) => { void _origin; void _benchmark; return source; }) });
  }
  if (receipts.length) for (const match of response.text.matchAll(/https?:\/\/[^\s<>\)\]]+/g)) {
    if (!urls.has(match[0].replace(/[.,;]$/, ""))) throw new Error("Unverified research citation.");
  }
  if (receipts.length) for (const match of response.text.matchAll(/\bfinding_[a-zA-Z0-9_]+\b/g)) {
    if (!receipts.some(receipt => receipt.findingIds.includes(match[0]))) throw new Error("Unverified finding reference.");
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
