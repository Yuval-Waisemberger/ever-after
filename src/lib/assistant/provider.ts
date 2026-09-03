import type { WeddingAssistantProvider } from "./types";
import { LocalWeddingAssistantProvider } from "./local-provider";

export function getWeddingAssistantProvider(): WeddingAssistantProvider {
  // External paid providers are intentionally not selected or initialized without explicit approval.
  return new LocalWeddingAssistantProvider();
}
