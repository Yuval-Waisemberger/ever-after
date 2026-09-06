import { z } from "zod";

export const contextSectionSchema = z.enum(["wedding", "tasks", "vendors", "budget", "guestList"]);
// Metadata describes a source; only a trusted retrieval record can establish that it was read.
export const externalSourceSchema = z.object({
  url: z.url({ protocol: /^https$/ }), title: z.string().min(1).max(300), retrievedAt: z.iso.datetime(),
  sourceId: z.string().min(1).max(80).optional(), publisher: z.string().min(1).max(160).optional(),
  domain: z.string().min(1).max(253).optional(), publishedAt: z.iso.datetime().optional(), updatedAt: z.iso.datetime().optional(),
  relevance: z.string().min(1).max(500).optional(),
  sourceType: z.enum(["official", "reported_market_guidance", "commercial_article", "advertised_listing", "research_report"]).optional(),
}).strict();
export const evidenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("COUPLE_DATA"), section: contextSectionSchema }).strict(),
  z.object({ kind: z.literal("MARKETPLACE_DATA"), vendorIds: z.array(z.string().min(1)).min(1) }).strict(),
  z.object({ kind: z.literal("EXTERNAL_CURRENT_EVIDENCE"), sources: z.array(externalSourceSchema).min(1).max(8) }).strict(),
  z.object({ kind: z.literal("AI_RECOMMENDATION") }).strict(),
]);
export type AgentEvidence = z.infer<typeof evidenceSchema>;
export type ContextSection = z.infer<typeof contextSectionSchema>;

// Compatibility with existing conversation rows/UI; evidence kinds are the core contract.
const sourceLabels: Record<AgentEvidence["kind"], string> = {
  COUPLE_DATA: "Couple data", MARKETPLACE_DATA: "Internal vendor database",
  EXTERNAL_CURRENT_EVIDENCE: "Web research", AI_RECOMMENDATION: "General guidance",
};
export function evidenceSourceLabels(evidence: AgentEvidence[]): string[] {
  return [...new Set(evidence.map((item) => sourceLabels[item.kind]))];
}
