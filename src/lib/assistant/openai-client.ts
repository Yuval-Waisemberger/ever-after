import "next/headers";
import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { OPENAI_TIMEOUT_MS, type OpenAIConfig } from "./openai-config";

// Narrow injectable SDK seam. Unknown output must pass provider validation.
export interface OpenAIResponsesClient {
  responses: { create(input: ResponseCreateParamsNonStreaming): Promise<unknown> };
}
export function createOpenAIClient(config: OpenAIConfig): OpenAIResponsesClient {
  return new OpenAI({ apiKey: config.apiKey, maxRetries: 0, timeout: OPENAI_TIMEOUT_MS,
    // Do not inherit SDK debug logging from the environment.
    logLevel: "off", dangerouslyAllowBrowser: false });
}
