import { z } from "zod";
import { assessResearchEligibility } from "../research/policy";

// Mirrors the existing READ allowlist without importing the server executor into pure contracts.
export const readToolName = z.enum(["get_wedding_summary", "list_tasks", "get_timeline_summary", "get_budget_summary", "get_upcoming_payments", "get_couple_vendors", "search_marketplace_vendors", "compare_vendors", "get_guest_list_summary", "get_missing_wedding_details"]);
export const capability = z.enum(["roadmap", "tasks", "timeline", "budget", "payments", "vendor_discovery", "vendor_comparison", "quote_evaluation", "guest_insights", "wedding_week", "communication", "current_information"]);
type Tool = z.output<typeof readToolName>;
const selection: Record<z.output<typeof capability>, { needed: Tool[]; optional: Tool[] }> = {
  roadmap: { needed: ["get_wedding_summary", "list_tasks", "get_missing_wedding_details", "get_couple_vendors", "get_budget_summary", "get_upcoming_payments"], optional: ["get_guest_list_summary"] },
  tasks: { needed: ["list_tasks"], optional: ["get_wedding_summary"] },
  timeline: { needed: ["get_timeline_summary"], optional: [] },
  budget: { needed: ["get_wedding_summary", "get_budget_summary"], optional: ["get_couple_vendors", "get_upcoming_payments"] },
  payments: { needed: ["get_upcoming_payments"], optional: [] },
  vendor_discovery: { needed: ["get_wedding_summary", "search_marketplace_vendors"], optional: ["compare_vendors"] },
  vendor_comparison: { needed: ["get_couple_vendors", "compare_vendors"], optional: [] },
  quote_evaluation: { needed: ["get_wedding_summary"], optional: ["search_marketplace_vendors", "get_budget_summary"] },
  guest_insights: { needed: ["get_guest_list_summary"], optional: [] },
  wedding_week: { needed: ["get_wedding_summary", "list_tasks", "get_upcoming_payments", "get_couple_vendors", "get_guest_list_summary"], optional: ["get_missing_wedding_details"] },
  communication: { needed: [], optional: ["get_couple_vendors"] },
  current_information: { needed: [], optional: ["get_wedding_summary"] },
};
export const orchestrationInput = z.object({
  capability, scope: z.enum(["in_scope", "out_of_scope", "uncertain"]),
  needsMarketComparison: z.boolean().default(false),
}).strict();
// Structured, server-reviewed intent only. No text matching, calls, loop or execution grant.
export function planOrchestration(raw: unknown) {
  const input = orchestrationInput.parse(raw);
  const allowed = input.scope === "in_scope";
  const purpose = input.capability === "quote_evaluation" || (input.capability === "budget" && input.needsMarketComparison) ? "market_benchmark"
    : input.capability === "current_information" ? "current_wedding_information"
      : input.capability === "communication" ? "wedding_drafting" : input.capability === "vendor_discovery" ? "marketplace_discovery"
        : input.capability === "vendor_comparison" ? "personalized_vendor_comparison" : "couple_records";
  return {
    ...input, readTools: allowed ? [...selection[input.capability].needed] : [], optionalReadTools: allowed ? [...selection[input.capability].optional] : [],
    clarificationMayBeRequired: input.scope === "uncertain" || (allowed && ["roadmap", "quote_evaluation", "budget", "vendor_comparison"].includes(input.capability)),
    research: assessResearchEligibility({ domain: input.scope, purpose }),
    recommendationEvidence: "AI_RECOMMENDATION" as const, executionEnabled: false as const,
  };
}

export const clarificationField = z.enum(["category", "quotedPrice", "coverageHours", "videoIncluded", "region", "weddingDate", "guestCount", "totalBudgetMinor"]);
export const clarificationSchema = z.object({
  required: z.boolean(),
  missingFields: z.array(z.object({ field: clarificationField, questionIntent: z.enum(["identify_service", "specify_quote", "define_package", "locate_event", "set_planning_context"]), reason: z.enum(["package_comparability", "regional_comparability", "date_guidance", "budget_scale"]) }).strict()).max(9),
}).strict().refine((value) => value.required === (value.missingFields.length > 0), "Clarification state must match missing facts.");
