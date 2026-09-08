import "next/headers";
import type { WeddingAssistantProvider } from "./types";
import { LocalWeddingAssistantProvider } from "./local-provider";
import { OpenAIWeddingAssistantProvider } from "./openai-provider";
import { readOpenAIConfig } from "./openai-config";

export class UnsupportedAssistantProviderError extends Error {
  constructor() {
    super("Wedding Assistant provider configuration is unavailable.");
    this.name = "UnsupportedAssistantProviderError";
  }
}

export function getWeddingAssistantProvider(configured = process.env.AI_PROVIDER): WeddingAssistantProvider {
  // Missing means local in every environment. Explicit empty/unknown values are errors.
  if (configured === undefined || configured === "local") return new LocalWeddingAssistantProvider();
  if (configured === "openai") {
    try { return new OpenAIWeddingAssistantProvider(readOpenAIConfig()); }
    catch { throw new UnsupportedAssistantProviderError(); }
  }
  throw new UnsupportedAssistantProviderError();
}
