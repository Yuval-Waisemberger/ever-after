import "next/headers";
import { z } from "zod";
import { createOpenAIClient, type OpenAIResponsesClient } from "./openai-client";
import type { OpenAIConfig } from "./openai-config";
import { assessWeddingDomain } from "./domain-policy";
import { assistantCopy, selectResponseLanguage } from "./language";
import type { AssistantRequest, AssistantResponse, SelectiveAssistantRequest, WeddingAssistantProvider } from "./types";
import { InvalidOpenAIResult, runOpenAIToolLoop } from "./openai-tool-loop";
import { logAssistantDiagnostic as diagnostic } from "./diagnostics";

export class OpenAIWeddingAssistantProvider implements WeddingAssistantProvider {
  readonly name = "openai";
  constructor(private readonly config: OpenAIConfig,
    private readonly clientFactory: (config: OpenAIConfig) => OpenAIResponsesClient = createOpenAIClient) {}

  respond(request: AssistantRequest): Promise<AssistantResponse> {
    // Compatibility with the original contract; eager context is never forwarded.
    return this.respondSelective({ message: request.message, language: request.language });
  }
  async respondSelective(request: SelectiveAssistantRequest): Promise<AssistantResponse> {
    const { language } = selectResponseLanguage(request.message, undefined, request.language);
    if (assessWeddingDomain(request.message) === "out_of_scope") {
      return { status: "out_of_scope", text: assistantCopy[language].redirect, language, evidence: [] };
    }
    try {
      diagnostic({ stage: "provider", outcome: "start" });
      const message = z.string().trim().min(1).max(3000).parse(request.message);
      const result = await runOpenAIToolLoop({ ...request, message }, language, this.config, this.clientFactory(this.config));
      diagnostic({ stage: "provider", outcome: "success", status: result.status });
      return result;
    } catch (error) {
      const invalid = error instanceof InvalidOpenAIResult || error instanceof z.ZodError;
      diagnostic({ stage: "provider", outcome: "failure", code: invalid ? "INVALID_PROVIDER_RESULT" : "PROVIDER_UNAVAILABLE" });
      return { status: invalid ? "error" : "unavailable", text: invalid ? assistantCopy[language].verify : assistantCopy[language].provider,
        language, evidence: [], error: { code: invalid ? "INVALID_PROVIDER_RESULT" : "PROVIDER_UNAVAILABLE", retryable: false } };
    }
  }
}
