import { getWeddingSummary, listTasks, getTimelineSummary, getBudgetSummary, getUpcomingPayments, getGuestListSummary, getMissingWeddingDetails } from "./planning";
import { getCoupleVendors, searchMarketplaceVendors, compareVendors } from "./vendors";
import { ToolReadError, unavailable } from "./server";

// Server-only through the next/headers dependency in createClient. No client/API
// endpoint, provider-specific JSON, raw SQL, table-name input or write dispatcher.
export const assistantReadTools = Object.freeze({
  get_wedding_summary: getWeddingSummary,
  list_tasks: listTasks,
  get_timeline_summary: getTimelineSummary,
  get_budget_summary: getBudgetSummary,
  get_upcoming_payments: getUpcomingPayments,
  get_couple_vendors: getCoupleVendors,
  search_marketplace_vendors: searchMarketplaceVendors,
  compare_vendors: compareVendors,
  get_guest_list_summary: getGuestListSummary,
  get_missing_wedding_details: getMissingWeddingDetails,
});
export type AssistantReadToolName = keyof typeof assistantReadTools;

export function executeAssistantReadTool(name: string, input: unknown = {}) {
  if (!Object.hasOwn(assistantReadTools, name)) return Promise.resolve(unavailable(new ToolReadError("UNKNOWN_TOOL")));
  return assistantReadTools[name as AssistantReadToolName].execute(input);
}

// Future adapters can use these provider-neutral schemas as definitions. Every
// invocation must still go through the server executor, which authenticates anew.
export const assistantReadToolDefinitions = Object.values(assistantReadTools).map(({ name, description, readOnly, inputSchema, outputSchema }) => ({ name, description, readOnly, inputSchema, outputSchema }));
