import { z } from "zod";
import { evidenceSchema } from "../evidence";
import { futureResearchContracts, researchSourceSchema } from "./contracts";
import { normalizedResearchRequestSchema } from "./policy";

const receiptSchema = z.object({
  researchedAt: z.iso.datetime(), sources: z.array(researchSourceSchema).max(8).refine((items) => new Set(items.map((source) => source.sourceId)).size === items.length),
}).strict();
// Future server-owned receipt: actual retrieval metadata, never a model assertion.
// No receipt producer or live retrieval implementation exists in this phase.
export function validateResearchProvenance(normalizedRequest: unknown, raw: unknown, receipt: unknown, now = new Date()) {
  const request = normalizedResearchRequestSchema.parse(normalizedRequest);
  const result = futureResearchContracts[request.tool].outputSchema.parse(raw);
  if (result.status === "unavailable") return result; // No prices, sources or research timestamps exist here.
  const trusted = receiptSchema.parse(receipt);
  if (result.researchedAt !== trusted.researchedAt || new Date(result.researchedAt).getTime() > now.getTime()) throw new Error("Unverified research timestamp.");
  for (const source of result.sources) {
    const observed = trusted.sources.find((item) => item.sourceId === source.sourceId);
    if (!observed || JSON.stringify(source) !== JSON.stringify(observed)) throw new Error("Source was not verified by the research boundary.");
  }
  if (result.status === "success" || result.status === "partial") {
    const keys = request.tool === "get_market_benchmark" ? ["purpose", "category", "countryCode", "region", "quotedPrice"] : ["topic", "countryCode", "region"];
    for (const key of keys) {
      if (JSON.stringify(Reflect.get(result.data, key)) !== JSON.stringify(Reflect.get(request.attributes, key))) throw new Error("Research changed the authorized request context.");
    }
  }
  return result;
}

const reference = z.string().min(1).max(80);
const kind = z.enum(["COUPLE_DATA", "MARKETPLACE_DATA", "EXTERNAL_CURRENT_EVIDENCE", "AI_RECOMMENDATION"]);
export const evidenceLedgerSchema = z.array(z.object({ id: reference, evidence: evidenceSchema }).strict()).max(50)
  .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, "Evidence IDs must be unique.");
export const answerClaimsSchema = z.array(z.object({
  text: z.string().min(1).max(1000), kind,
  basis: z.array(z.object({ evidenceId: reference, kind }).strict()).min(1).max(10),
}).strict()).max(30);

export function validateAnswerProvenance(raw: unknown, serverEvidenceLedger: unknown) {
  const claims = answerClaimsSchema.parse(raw);
  const ledger = evidenceLedgerSchema.parse(serverEvidenceLedger);
  for (const claim of claims) {
    let ownKindPresent = false;
    for (const basis of claim.basis) {
      const recorded = ledger.find((entry) => entry.id === basis.evidenceId);
      if (!recorded || recorded.evidence.kind !== basis.kind) throw new Error("Evidence cannot be relabelled or invented.");
      if (basis.kind === claim.kind) ownKindPresent = true;
      if (claim.kind !== "AI_RECOMMENDATION" && basis.kind !== claim.kind) throw new Error("Factual claims must preserve their evidence class; split mixed facts into separate claims.");
    }
    if (!ownKindPresent) throw new Error("Claim must identify its own evidence class.");
  }
  return claims;
}
