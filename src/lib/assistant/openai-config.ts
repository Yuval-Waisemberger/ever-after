// Explicit Next.js server-only dependency; rejected from Client Components.
import "next/headers";
import { z } from "zod";

export const OPENAI_TIMEOUT_MS = 30_000;
export const OPENAI_MAX_OUTPUT_TOKENS = 1_200;
export const OPENAI_MAX_TEXT_CHARACTERS = 10_000;

const configSchema = z.object({
  apiKey: z.string().trim().min(1).max(512),
  model: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9._:-]+$/),
});
export type OpenAIConfig = z.infer<typeof configSchema>;
export class OpenAIConfigurationError extends Error {
  constructor() { super("Wedding Assistant provider configuration is unavailable."); }
}
export function readOpenAIConfig(): OpenAIConfig {
  const result = configSchema.safeParse({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL });
  if (!result.success) throw new OpenAIConfigurationError();
  return result.data;
}
