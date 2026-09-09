import { z } from "zod";
import { benchmarkInputSchema, currentInfoInputSchema, researchToolName } from "./contracts";
import { area, date, eventType } from "../tools/contracts";

export const claimSensitivitySchema = z.enum(["price", "market", "location", "procedure", "regulation", "time_sensitive"]);
export const researchDecisionInputSchema = z.object({
  // Must come from a future server-reviewed semantic decision, not a client flag.
  domain: z.enum(["in_scope", "out_of_scope", "uncertain"]),
  purpose: z.enum(["couple_records", "marketplace_discovery", "personalized_vendor_comparison", "market_benchmark", "current_wedding_information", "wedding_ideas", "wedding_drafting"]),
  currentClaimSensitivities: z.array(claimSensitivitySchema).max(6).default([]),
}).strict();
export function assessResearchEligibility(raw: unknown) {
  const input = researchDecisionInputSchema.parse(raw);
  const base = { liveResearchAvailable: false as const };
  if (input.domain === "out_of_scope") return { ...base, route: "redirect" as const, eligibleTool: null, requiredEvidence: [] };
  if (input.domain === "uncertain") return { ...base, route: "clarify" as const, eligibleTool: null, requiredEvidence: [] };
  if (["couple_records", "marketplace_discovery", "personalized_vendor_comparison"].includes(input.purpose)) {
    return { ...base, route: "internal_only" as const, eligibleTool: null, requiredEvidence: input.purpose === "couple_records" ? ["COUPLE_DATA"] : input.purpose === "marketplace_discovery" ? ["MARKETPLACE_DATA"] : ["COUPLE_DATA", "MARKETPLACE_DATA"] };
  }
  if (input.purpose === "market_benchmark" || input.currentClaimSensitivities.some((kind) => kind === "price" || kind === "market")) {
    return { ...base, route: "benchmark" as const, eligibleTool: "get_market_benchmark" as const, requiredEvidence: ["EXTERNAL_CURRENT_EVIDENCE"] };
  }
  if (input.purpose === "current_wedding_information" || input.currentClaimSensitivities.length) {
    return { ...base, route: "current_info" as const, eligibleTool: "research_current_wedding_info" as const, requiredEvidence: ["EXTERNAL_CURRENT_EVIDENCE"] };
  }
  return { ...base, route: "general_guidance" as const, eligibleTool: null, requiredEvidence: ["AI_RECOMMENDATION"] };
}

export function currentMarketClaimPolicy(sensitivities: unknown, verification: "verified_current" | "partial_current" | "unavailable" | "insufficient_evidence" | "unverified") {
  const requiresCurrentEvidence = z.array(claimSensitivitySchema).max(6).parse(sensitivities).length > 0;
  return {
    requiresCurrentEvidence,
    canAssertCurrentFact: !requiresCurrentEvidence || verification === "verified_current" || verification === "partial_current",
    mustQualify: requiresCurrentEvidence && verification === "partial_current",
    mustDiscloseUnverified: requiresCurrentEvidence && !["verified_current", "partial_current"].includes(verification),
    generalGuidanceLabel: "AI_RECOMMENDATION" as const,
  };
}

function normalizedPlanning(input: z.output<typeof benchmarkInputSchema>, now: Date) {
  return {
    countryCode: input.countryCode, ...(input.region ? { region: input.region } : {}),
    ...(input.eventType && input.eventType !== "undecided" ? { eventType: input.eventType } : {}),
    ...(input.guestCount ? { guestScale: { lower: Math.floor((input.guestCount - 1) / 50) * 50 + 1, upper: Math.ceil(input.guestCount / 50) * 50 } } : {}),
    ...(input.weddingDate ? { weddingMonth: input.weddingDate.slice(0, 7) } : {}),
    asOfDate: now.toISOString().slice(0, 10),
  };
}
const normalizedPlanningFields = {
  countryCode: z.literal("IL"), region: area.optional(), eventType: eventType.optional(),
  guestScale: z.object({ lower: z.number().int().min(1).max(5000), upper: z.number().int().min(1).max(5000) }).strict().refine((value) => value.lower <= value.upper).optional(),
  weddingMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), asOfDate: date,
};
export const normalizedResearchRequestSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("get_market_benchmark"), attributes: z.object({
    ...normalizedPlanningFields, purpose: benchmarkInputSchema.shape.purpose, category: benchmarkInputSchema.shape.category,
    packageFeatures: benchmarkInputSchema.shape.packageFeatures, quotedPrice: benchmarkInputSchema.shape.quotedPrice,
    coverageHours: benchmarkInputSchema.shape.coverageHours, numberOfProfessionals: benchmarkInputSchema.shape.numberOfProfessionals, videoIncluded: benchmarkInputSchema.shape.videoIncluded,
  }).strict() }).strict(),
  z.object({ tool: z.literal("research_current_wedding_info"), attributes: z.object({ ...normalizedPlanningFields, topic: currentInfoInputSchema.shape.topic, aspect: currentInfoInputSchema.shape.aspect }).strict() }).strict(),
]);
// This emits attributes, not an arbitrary search string. No names, IDs, contacts,
// exact wedding day or user-authored offer/notes text can enter the adapter payload.
export function normalizeResearchRequest(toolName: unknown, raw: unknown, now = new Date()) {
  const tool = researchToolName.parse(toolName);
  if (tool === "get_market_benchmark") {
    const input = benchmarkInputSchema.parse(raw);
    return normalizedResearchRequestSchema.parse({ tool, attributes: {
      ...normalizedPlanning(input, now), purpose: input.purpose,
      ...(input.category ? { category: input.category } : {}),
      packageFeatures: [...new Set(input.packageFeatures)].sort(),
      ...(input.quotedPrice ? { quotedPrice: input.quotedPrice } : {}),
      ...(input.coverageHours != null ? { coverageHours: input.coverageHours } : {}),
      ...(input.numberOfProfessionals != null ? { numberOfProfessionals: input.numberOfProfessionals } : {}),
      ...(input.videoIncluded != null ? { videoIncluded: input.videoIncluded } : {}),
    } });
  }
  const input = currentInfoInputSchema.parse(raw);
  // Procedural queries do not need a Couple's event scale or event date.
  const eventRelevant = input.topic === "wedding_industry_norms" || input.topic === "wedding_logistics";
  const context = eventRelevant ? input : { countryCode: input.countryCode, region: input.region };
  return normalizedResearchRequestSchema.parse({ tool, attributes: { ...normalizedPlanning({ ...context, purpose: "overall_budget", packageFeatures: [] }, now), topic: input.topic, aspect: input.aspect } });
}
export type NormalizedResearchRequest = ReturnType<typeof normalizeResearchRequest>;
export function researchRequestKey(request: NormalizedResearchRequest) {
  // Normalization has fixed field order and sorted/deduplicated feature values.
  return JSON.stringify(normalizedResearchRequestSchema.parse(request));
}

export const FUTURE_RESEARCH_COST_POLICY = Object.freeze({
  maxCallsPerMessage: 1, maxSourcesPerCall: 8, timeoutMs: 15000,
  deduplicateWithinAnswer: true, automaticProviderFallback: false,
  accountSessionRateLimitsRequiredBeforeEnablement: false,
});
