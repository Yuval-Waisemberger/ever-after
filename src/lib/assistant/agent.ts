import { AssistantContextUnavailableError } from "./context-error";
import { assessWeddingDomain, WEDDING_DOMAIN_POLICY } from "./domain-policy";
import { prepareAssistantContext } from "./privacy";
import { assistantResponseSchema, type AssistantContext, type AssistantResponse, type WeddingAssistantProvider } from "./types";

export function validateAgentResponse(input: unknown, context: AssistantContext): AssistantResponse {
  const response = assistantResponseSchema.parse(input);
  // Phase 1A has no tool execution, research or proposal UI. Adapters cannot claim otherwise.
  if (response.toolUsage?.length || response.actionProposal) throw new Error("Agent capability is disabled.");
  for (const evidence of response.evidence) {
    if (evidence.kind === "EXTERNAL_CURRENT_EVIDENCE") throw new Error("Research is disabled.");
    if (evidence.kind === "MARKETPLACE_DATA" && evidence.vendorIds.some((id) =>
      !context.vendors.some((vendor) => vendor.id === id && vendor.source === "marketplace"))) {
      throw new Error("Marketplace evidence is not in the authorized context.");
    }
  }
  return response;
}

export async function runWeddingAgent({ message, provider, loadContext }: {
  message: string; provider: WeddingAssistantProvider; loadContext: () => Promise<AssistantContext>;
}): Promise<AssistantResponse> {
  if (assessWeddingDomain(message) === "out_of_scope") {
    return { status: "out_of_scope", text: WEDDING_DOMAIN_POLICY.redirect, evidence: [] };
  }
  let context: AssistantContext;
  try { context = prepareAssistantContext(await loadContext()); } catch (error) {
    const labels = { wedding: "wedding details", tasks: "tasks", budget: "budget and payment information", vendors: "vendor information", guestList: "Guest List summary" };
    const information = error instanceof AssistantContextUnavailableError ? labels[error.section] : "wedding information";
    return { status: "unavailable", text: `I couldn't access your ${information} right now. Please try again.`, evidence: [], error: { code: "CONTEXT_UNAVAILABLE", retryable: true } };
  }
  let response: unknown;
  try { response = await provider.respond({ message, context }); } catch {
    return { status: "unavailable", text: "The Wedding Assistant couldn't answer right now. Please try again.", evidence: [], error: { code: "PROVIDER_UNAVAILABLE", retryable: true } };
  }
  try { return validateAgentResponse(response, context); } catch {
    return { status: "error", text: "The Wedding Assistant couldn't verify this answer. Please try again.", evidence: [], error: { code: "INVALID_PROVIDER_RESULT", retryable: true } };
  }
}
