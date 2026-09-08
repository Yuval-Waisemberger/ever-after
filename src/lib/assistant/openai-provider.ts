import "next/headers";
import { z } from "zod";
import { createOpenAIClient, type OpenAIResponsesClient } from "./openai-client";
import { OPENAI_MAX_OUTPUT_TOKENS, OPENAI_MAX_TEXT_CHARACTERS, type OpenAIConfig } from "./openai-config";
import { openAIWeddingInstructions } from "./openai-instructions";
import { assessWeddingDomain } from "./domain-policy";
import { assistantCopy, selectResponseLanguage, type AssistantLanguage } from "./language";
import { assistantResponseSchema, type AssistantRequest, type AssistantResponse, type WeddingAssistantProvider } from "./types";

// Inspect output items, not the SDK output_text convenience field: a tool request
// alongside text must never be mistaken for a completed plain-text response.
const outputMessage = z.object({
  type: z.literal("message"), role: z.literal("assistant"), status: z.literal("completed"),
  content: z.array(z.object({ type: z.literal("output_text"), text: z.string().max(OPENAI_MAX_TEXT_CHARACTERS),
    annotations: z.array(z.never()).default([]) })).min(1).max(8),
});
const responseEnvelope = z.object({
  status: z.literal("completed"), error: z.null().optional(), incomplete_details: z.null().optional(),
  output: z.array(z.union([outputMessage,
    // Reasoning items may be present for reasoning models; never return/persist them.
    z.object({ type: z.literal("reasoning") }),
  ])).min(1).max(16),
  usage: z.unknown().optional(),
  evidence: z.never().optional(), toolUsage: z.never().optional(), actionProposal: z.never().optional(),
});
const usageSchema = z.object({ input_tokens: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  output_tokens: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });

function unavailable(language: AssistantLanguage, invalid = false): AssistantResponse {
  return { status: invalid ? "error" : "unavailable", text: invalid ? assistantCopy[language].verify : assistantCopy[language].provider,
    language, evidence: [], error: { code: invalid ? "INVALID_PROVIDER_RESULT" : "PROVIDER_UNAVAILABLE", retryable: false } };
}

export class OpenAIWeddingAssistantProvider implements WeddingAssistantProvider {
  readonly name = "openai";
  constructor(private readonly config: OpenAIConfig,
    private readonly clientFactory: (config: OpenAIConfig) => OpenAIResponsesClient = createOpenAIClient) {}

  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    const { language } = selectResponseLanguage(request.message, undefined, request.language);
    if (assessWeddingDomain(request.message) === "out_of_scope") {
      return { status: "out_of_scope", text: assistantCopy[language].redirect, language, evidence: [] };
    }
    const question = z.string().trim().min(1).max(3000).safeParse(request.message);
    if (!question.success) return unavailable(language, true);
    let raw: unknown;
    try {
      raw = await this.clientFactory(this.config).responses.create({
        model: this.config.model, instructions: openAIWeddingInstructions(language),
        input: [{ role: "user", content: question.data }], max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
        store: false, stream: false,
      });
    } catch {
      // Timeouts/429/auth/network errors are indistinguishable to the UI. No raw
      // errors, headers or IDs escape, and no automatic retry is authorized.
      return unavailable(language);
    }
    const parsed = responseEnvelope.safeParse(raw);
    if (!parsed.success) return unavailable(language, true);
    const text = parsed.data.output.flatMap(item => item.type === "message" ? item.content.map(part => part.text) : []).join("\n").trim();
    // Reject rather than truncate UTF-16/surrogate pairs or alter the answer.
    if (!text || text.length > OPENAI_MAX_TEXT_CHARACTERS) return unavailable(language, true);
    const usage = usageSchema.safeParse(parsed.data.usage);
    return assistantResponseSchema.parse({ status: "ok", text, language, evidence: [{ kind: "AI_RECOMMENDATION" }],
      ...(usage.success ? { usage: { inputTokens: usage.data.input_tokens, outputTokens: usage.data.output_tokens } } : {}) });
  }
}
