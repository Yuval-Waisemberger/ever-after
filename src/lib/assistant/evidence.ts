import { z } from "zod";

export const contextSectionSchema = z.enum(["wedding", "tasks", "vendors", "budget", "guestList"]);
export const evidenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("COUPLE_DATA"), section: contextSectionSchema }).strict(),
  z.object({ kind: z.literal("MARKETPLACE_DATA"), vendorIds: z.array(z.string().min(1)).min(1) }).strict(),
  z.object({ kind: z.literal("EXTERNAL_CURRENT_EVIDENCE"), sources: z.array(z.object({
    url: z.url(), title: z.string().min(1), retrievedAt: z.iso.datetime(),
  }).strict()).min(1) }).strict(),
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
