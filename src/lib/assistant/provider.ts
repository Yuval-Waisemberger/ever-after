import type { WeddingAssistantProvider } from "./types";
import { LocalWeddingAssistantProvider } from "./local-provider";

export class UnsupportedAssistantProviderError extends Error {
  constructor() {
    super("Unsupported AI_PROVIDER configuration. Only 'local' is available.");
    this.name = "UnsupportedAssistantProviderError";
  }
}

export function getWeddingAssistantProvider(configured = process.env.AI_PROVIDER): WeddingAssistantProvider {
  // Missing means local in every environment. Explicit empty/unknown values are errors.
  if (configured === undefined || configured === "local") return new LocalWeddingAssistantProvider();
  throw new UnsupportedAssistantProviderError();
}
