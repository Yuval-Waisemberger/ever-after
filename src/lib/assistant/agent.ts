import { AssistantContextUnavailableError } from "./context-error";
import { assessWeddingDomain, WEDDING_DOMAIN_POLICY } from "./domain-policy";
import { prepareAssistantContext } from "./privacy";
import { assistantResponseSchema, type AssistantContext, type AssistantResponse, type SelectiveAssistantRequest, type WeddingAssistantProvider } from "./types";
import { hasVerifiedToolClaims } from "./openai-tool-trust";
import { assistantCopy, contextUnavailableText, selectResponseLanguage, type AssistantLanguage } from "./language";

export function validateAgentResponse(input: unknown, context?: AssistantContext): AssistantResponse {
  const response = assistantResponseSchema.parse(input);
  const trusted = hasVerifiedToolClaims(input);
  if ((response.toolUsage?.length && !trusted) || response.actionProposal) throw new Error("Agent capability is disabled.");
  for (const evidence of response.evidence) {
    if (evidence.kind === "EXTERNAL_CURRENT_EVIDENCE") throw new Error("Research is disabled.");
    if (!trusted && !context && evidence.kind !== "AI_RECOMMENDATION") throw new Error("Unverified selective evidence.");
    if (evidence.kind === "MARKETPLACE_DATA" && !trusted && (!evidence.vendorIds.length || evidence.vendorIds.some((id) =>
      !context?.vendors.some((vendor) => vendor.id === id && vendor.source === "marketplace")))) {
      throw new Error("Marketplace evidence is not in the authorized context.");
    }
  }
  return response;
}

export async function runWeddingAgent({ message, provider, loadContext, recentLanguage, requestedLanguage, history }: {
  message: string; provider: WeddingAssistantProvider; loadContext: () => Promise<AssistantContext>; recentLanguage?: AssistantLanguage; requestedLanguage?: AssistantLanguage; history?: SelectiveAssistantRequest["history"];
}): Promise<AssistantResponse> {
  const { language } = selectResponseLanguage(message, recentLanguage, requestedLanguage);
  const copy = assistantCopy[language];
  if (assessWeddingDomain(message) === "out_of_scope") {
    return { status: "out_of_scope", text: language === "en" ? WEDDING_DOMAIN_POLICY.redirect : copy.redirect, evidence: [], language };
  }
  if (provider.respondSelective) {
    let response: unknown;
    try { response = await provider.respondSelective({ message, language, history }); } catch {
      return { status: "unavailable", text: copy.error, evidence: [], language, error: { code: "PROVIDER_UNAVAILABLE", retryable: false } };
    }
    try { return { ...validateAgentResponse(response), language }; } catch {
      return { status: "error", text: copy.verify, evidence: [], language, error: { code: "INVALID_PROVIDER_RESULT", retryable: false } };
    }
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
