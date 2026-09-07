import { z } from "zod";
import { assistantLanguage } from "../assistant/language";

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1, "Ask a question").max(3000),
  threadId: z.string().uuid().nullable().optional(),
  recentLanguage: assistantLanguage.optional(),
  requestedLanguage: assistantLanguage.optional(),
});
