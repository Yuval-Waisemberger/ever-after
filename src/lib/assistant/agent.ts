import { AssistantContextUnavailableError } from "./context-error";
import { assessWeddingDomain, WEDDING_DOMAIN_POLICY } from "./domain-policy";
import { prepareAssistantContext } from "./privacy";
import { assistantResponseSchema, type AssistantContext, type AssistantResponse, type WeddingAssistantProvider } from "./types";
import { assistantCopy, contextUnavailableText, selectResponseLanguage, type AssistantLanguage } from "./language";

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

export async function runWeddingAgent({ message, provider, loadContext, recentLanguage, requestedLanguage }: {
  message: string; provider: WeddingAssistantProvider; loadContext: () => Promise<AssistantContext>; recentLanguage?: AssistantLanguage; requestedLanguage?: AssistantLanguage;
}): Promise<AssistantResponse> {
  const { language } = selectResponseLanguage(message, recentLanguage, requestedLanguage);
  const copy = assistantCopy[language];
  if (assessWeddingDomain(message) === "out_of_scope") {
    return { status: "out_of_scope", text: language === "en" ? WEDDING_DOMAIN_POLICY.redirect : copy.redirect, evidence: [], language };
  }
  let context: AssistantContext;
  try { context = prepareAssistantContext(await loadContext()); } catch (error) {
    return { status: "unavailable", text: contextUnavailableText(language, error instanceof AssistantContextUnavailableError ? error.section : "unknown"), evidence: [], language, error: { code: "CONTEXT_UNAVAILABLE", retryable: true } };
  }
  let response: unknown;
  try { response = await provider.respond({ message, context, language }); } catch {
    return { status: "unavailable", text: copy.error, evidence: [], language, error: { code: "PROVIDER_UNAVAILABLE", retryable: true } };
  }
  try { return { ...validateAgentResponse(response, context), language }; } catch {
    return { status: "error", text: copy.verify, evidence: [], language, error: { code: "INVALID_PROVIDER_RESULT", retryable: true } };
  }
}
