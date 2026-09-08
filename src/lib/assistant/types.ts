import { z } from "zod";
import type { assistantContextSchema } from "./privacy";
import { evidenceSchema } from "./evidence";
import { assistantLanguage, type AssistantLanguage } from "./language";
import { clarificationSchema } from "./planning/policy";
import type { buildConversationWindow } from "./planning/conversation";

export type AssistantContext = z.infer<typeof assistantContextSchema>;
export type AssistantTask = AssistantContext["tasks"][number];
export type AssistantVendor = AssistantContext["vendors"][number];
export type AssistantRequest = { message: string; context: AssistantContext; language?: AssistantLanguage };
export type SelectiveAssistantRequest = { message: string; language?: AssistantLanguage; history?: ReturnType<typeof buildConversationWindow> };

export const assistantResponseSchema = z.object({
  status: z.enum(["ok", "unavailable", "error", "out_of_scope"]),
  text: z.string().trim().min(1).max(16000),
  language: assistantLanguage.optional(),
  evidence: z.array(evidenceSchema).max(50),
  error: z.object({
    code: z.enum(["CONTEXT_UNAVAILABLE", "PROVIDER_UNAVAILABLE", "INVALID_PROVIDER_RESULT", "RESEARCH_UNAVAILABLE"]),
    retryable: z.boolean(),
  }).strict().optional(),
  clarification: z.object({ question: z.string().min(1).max(1000), missingFields: z.array(z.string().max(100)).max(20) }).strict().optional(),
  clarificationIntent: clarificationSchema.optional(),
  // OpenAI usage is verified against a server-owned turn record; proposals stay disabled.
  toolUsage: z.array(z.object({ name: z.string().min(1).max(100), callId: z.string().min(1).max(200).optional(), status: z.enum(["succeeded", "unavailable", "error"]) }).strict()).max(20).optional(),
  usage: z.object({ inputTokens: z.number().int().nonnegative().optional(), outputTokens: z.number().int().nonnegative().optional() }).strict().optional(),
  actionProposal: z.object({
    type: z.enum(["create_task", "book_vendor", "add_budget_item", "mark_payment_paid"]),
    summary: z.string().min(1).max(1000), arguments: z.record(z.string(), z.unknown()),
    requiresConfirmation: z.literal(true),
  }).strict().optional(),
}).strict().superRefine((result, ctx) => {
  if ((result.status === "error" || result.status === "unavailable") !== Boolean(result.error)) {
    ctx.addIssue({ code: "custom", message: "Error metadata must match the result status." });
  }
  if (result.status !== "ok" && (result.evidence.length || result.actionProposal)) {
    ctx.addIssue({ code: "custom", message: "Non-answer states cannot assert evidence or propose actions." });
  }
  if (result.status === "ok" && !result.evidence.length) {
    ctx.addIssue({ code: "custom", message: "Answers must identify their evidence or recommendation basis." });
  }
});
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;

// Local and the OpenAI foundation share this provider boundary.
export interface WeddingAssistantProvider {
  readonly name: string;
  respond(request: AssistantRequest): Promise<AssistantResponse>;
  respondSelective?(request: SelectiveAssistantRequest): Promise<AssistantResponse>;
}
