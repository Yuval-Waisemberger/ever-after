import { z } from "zod";
import { externalSourceSchema } from "../evidence";
import { area, date, eventType, money } from "../tools/contracts";

export const RESEARCH_BOUNDS = { sources: 8, findings: 12, assumptions: 12, text: 500 } as const;
const text = z.string().trim().min(1).max(RESEARCH_BOUNDS.text);
const reference = z.string().min(1).max(80);
const references = z.array(reference).min(1).max(RESEARCH_BOUNDS.sources);
const notes = z.array(text).max(RESEARCH_BOUNDS.assumptions);
const currency = z.enum(["ILS", "USD", "EUR"]);
const quote = z.object({ amountMinor: money, currency }).strict();

// Closed planning vocabulary prevents arbitrary personal text or general web queries
// entering a future adapter. This is a research vocabulary, not a price dataset.
export const researchService = z.enum(["venue", "photography", "videography", "music", "beauty_attire", "design_flowers", "food", "transportation", "officiant", "event_management", "invitations_gifts", "accommodation"]);
export const packageFeature = z.enum(["full_day", "half_day", "ceremony_only", "reception", "second_photographer", "video", "drone", "albums", "travel", "equipment", "staff", "food", "drinks", "tax_included"]);
export const researchTopic = z.enum(["marriage_registration", "ceremony_document_requirements", "wedding_procedures", "wedding_industry_norms", "wedding_logistics"]);
const planning = {
  countryCode: z.literal("IL").default("IL"), region: area.optional(), eventType: eventType.optional(),
  guestCount: z.number().int().min(1).max(5000).optional(), weddingDate: date.optional(),
};
export const benchmarkInputSchema = z.object({
  purpose: z.enum(["service_quote", "market_range", "overall_budget"]), category: researchService.optional(),
  packageFeatures: z.array(packageFeature).max(14).default([]), quotedPrice: quote.optional(),
  // Local-only context, deliberately excluded by normalizeResearchRequest.
  offerDescription: text.optional(), ...planning,
}).strict().superRefine((input, ctx) => {
  if (input.purpose !== "overall_budget" && !input.category) ctx.addIssue({ code: "custom", path: ["category"], message: "A wedding service is required for a service benchmark." });
});
export const currentInfoInputSchema = z.object({ topic: researchTopic, ...planning }).strict();
export const researchToolName = z.enum(["get_market_benchmark", "research_current_wedding_info"]);

export const researchSourceSchema = externalSourceSchema.extend({
  sourceId: reference, origin: z.literal("external_research"), domain: z.string().min(1).max(253),
  sourceType: externalSourceSchema.shape.sourceType.unwrap(), relevance: text,
}).superRefine((source, ctx) => {
  if (!URL.canParse(source.url)) return; // The URL schema already reports malformed input.
  const url = new URL(source.url);
  if (url.hostname !== source.domain || url.username || url.password) ctx.addIssue({ code: "custom", message: "Source domain must match its credential-free URL." });
  if ((source.publishedAt && Date.parse(source.publishedAt) > Date.parse(source.retrievedAt)) || (source.updatedAt && Date.parse(source.updatedAt) > Date.parse(source.retrievedAt))
    || (source.publishedAt && source.updatedAt && Date.parse(source.updatedAt) < Date.parse(source.publishedAt))) ctx.addIssue({ code: "custom", message: "Source dates are inconsistent." });
});
const sources = z.array(researchSourceSchema).max(RESEARCH_BOUNDS.sources).refine((items) => new Set(items.map((source) => source.sourceId)).size === items.length, "Source IDs must be unique.");
const quality = z.object({ confidence: z.enum(["low", "medium", "high"]), explanation: text }).strict();
const range = z.object({ lowMinor: money, highMinor: money, sourceIds: references }).strict()
  .refine((value) => value.lowMinor <= value.highMinor, "Range minimum exceeds maximum.");
const finding = z.object({ text, sourceIds: references }).strict();
export const benchmarkDataSchema = z.object({
  purpose: benchmarkInputSchema.shape.purpose, category: researchService.optional(), countryCode: z.literal("IL"), region: area.optional(),
  eventContext: notes, packageAssumptions: notes, quotedPrice: quote.optional(), currency,
  observedRange: range.nullable(), typicalRange: range.nullable(), pricingFactors: z.array(finding).max(RESEARCH_BOUNDS.findings),
  quality, limitations: notes,
}).strict().superRefine((value, ctx) => {
  if (value.typicalRange && (!value.observedRange || value.typicalRange.lowMinor < value.observedRange.lowMinor || value.typicalRange.highMinor > value.observedRange.highMinor)) {
    ctx.addIssue({ code: "custom", message: "A typical range requires a compatible observed range." });
  }
  if (value.quotedPrice && value.quotedPrice.currency !== value.currency) ctx.addIssue({ code: "custom", message: "Convert currencies with sourced evidence before comparison." });
});
export const currentInfoDataSchema = z.object({ topic: researchTopic, countryCode: z.literal("IL"), region: area.optional(), findings: z.array(finding).min(1).max(RESEARCH_BOUNDS.findings), quality, limitations: notes }).strict();
export const researchUnavailableSchema = z.object({
  status: z.literal("unavailable"), reason: z.enum(["RESEARCH_DISABLED", "SOURCE_FAILED", "TIMEOUT", "SAFETY_LIMIT"]),
  message: text, retryable: z.boolean(),
}).strict();
const insufficient = z.object({
  status: z.literal("insufficient_evidence"), reason: z.enum(["NO_RELEVANT_SOURCES", "STALE_SOURCES", "INCOMPARABLE_PACKAGES", "CONFLICTING_SOURCES"]),
  researchedAt: z.iso.datetime(), sources, limitations: notes.min(1),
}).strict();
function researchResultSchema(data: typeof benchmarkDataSchema | typeof currentInfoDataSchema) {
  return z.discriminatedUnion("status", [
    z.object({ status: z.literal("success"), data, researchedAt: z.iso.datetime(), sources: sources.min(1) }).strict(),
    z.object({ status: z.literal("partial"), data, researchedAt: z.iso.datetime(), sources: sources.min(1) }).strict(),
    insufficient, researchUnavailableSchema,
  ]).superRefine((result, ctx) => {
    if (result.status === "unavailable") return;
    if (result.sources.some((source) => Date.parse(source.retrievedAt) > Date.parse(result.researchedAt))) ctx.addIssue({ code: "custom", message: "Research cannot finish before its sources are accessed." });
    if (result.status === "insufficient_evidence") return;
    if (result.status === "partial" && !result.data.limitations.length) ctx.addIssue({ code: "custom", message: "Partial results must explain their limitations." });
    if (result.status === "success" && result.data.quality.confidence === "low") ctx.addIssue({ code: "custom", message: "Low confidence requires a partial result." });
    const findings = "findings" in result.data ? result.data.findings : result.data.pricingFactors;
    const ranges = "observedRange" in result.data ? [result.data.observedRange, result.data.typicalRange].filter((item) => item !== null) : [];
    for (const item of [...findings, ...ranges]) {
      if (item.sourceIds.some((id) => !result.sources.some((source) => source.sourceId === id))) ctx.addIssue({ code: "custom", message: "Finding references an absent source." });
    }
    if ("observedRange" in result.data && result.status === "success" && !result.data.observedRange) ctx.addIssue({ code: "custom", message: "A successful benchmark needs an observed range." });
    if ("typicalRange" in result.data && result.data.typicalRange) {
      const domains = new Set(result.sources.filter((source) => result.data && "typicalRange" in result.data && result.data.typicalRange?.sourceIds.includes(source.sourceId)).map((source) => source.domain));
      if (domains.size < 2) ctx.addIssue({ code: "custom", message: "A typical range requires at least two independent source domains, plus reviewed comparability." });
    }
  });
}
export const benchmarkResultSchema = researchResultSchema(benchmarkDataSchema);
export const currentInfoResultSchema = researchResultSchema(currentInfoDataSchema);

// Definitions only, deliberately separate from the executable internal READ registry.
export const futureResearchContracts = Object.freeze({
  get_market_benchmark: { live: false, inputSchema: benchmarkInputSchema, outputSchema: benchmarkResultSchema },
  research_current_wedding_info: { live: false, inputSchema: currentInfoInputSchema, outputSchema: currentInfoResultSchema },
});
export function unavailableResearchResult() {
  return researchUnavailableSchema.parse({ status: "unavailable", reason: "RESEARCH_DISABLED", message: "Current wedding-market information cannot be verified because live research is not enabled. General guidance can still be offered separately.", retryable: false });
}

// Future server adapters receive ONLY normalized requests and return untrusted
// output. This interface has no implementation, registration or factory.
export interface ResearchAdapter {
  research(request: import("./policy").NormalizedResearchRequest, signal: AbortSignal): Promise<unknown>;
}
