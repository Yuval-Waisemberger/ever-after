import { z } from "zod";

// Mirrors the hard SQL policy; these are not browser/configurable admission inputs.
export const REAL_AI_LIMITS = Object.freeze({ globalTurns: 500, coupleTurns: 150, windowTurns: 10, windowSeconds: 300, activePerCouple: 1 });
export const admissionState = z.enum(["admitted", "dispatched", "completed", "failed", "uncertain"]);
export const terminalOutcome = z.enum(["SUCCEEDED", "PRE_DISPATCH_FAILED", "PROVIDER_FAILED", "EXECUTION_UNCERTAIN"]);
export const guardrailCode = z.enum(["INVALID_INPUT", "NOT_AUTHORIZED", "REQUEST_CONFLICT", "GLOBAL_QUOTA_EXHAUSTED", "COUPLE_QUOTA_EXHAUSTED", "RATE_LIMITED", "REQUEST_ACTIVE", "INVALID_TRANSITION", "UNSUPPORTED_TRANSACTION", "ADMISSION_UNAVAILABLE"]);

// Future server boundary supplies identities + resolved language, not client authority.
// Keep this envelope stable across retries, including the original nullable thread ID.
export const realAiTurnSchema = z.object({
  requestId: z.uuid(), coupleId: z.uuid(), weddingId: z.uuid(), threadId: z.uuid().nullable(),
  message: z.string().trim().min(1).max(3000), language: z.enum(["en", "he"]),
}).strict();
export const admissionIdentitySchema = realAiTurnSchema.pick({ requestId: true, coupleId: true });
const rejected = z.object({ status: z.literal("rejected"), code: guardrailCode }).strict();
const identity = { requestId: z.uuid() };
export const admitResultSchema = z.discriminatedUnion("status", [
  rejected,
  z.object({ status: z.literal("admitted"), ...identity, state: z.literal("admitted") }).strict(),
  z.object({ status: z.literal("existing"), ...identity, state: admissionState }).strict(),
]);
export const dispatchResultSchema = z.discriminatedUnion("status", [rejected,
  z.object({ status: z.literal("dispatch_claimed"), ...identity, state: z.literal("dispatched") }).strict(),
]);
export const finishResultSchema = z.discriminatedUnion("status", [rejected,
  z.object({ status: z.literal("finished"), ...identity, state: z.enum(["completed", "failed", "uncertain"]) }).strict(),
]);
export const guardrailMessages: Record<z.output<typeof guardrailCode>, string> = {
  INVALID_INPUT: "This AI request is invalid.", NOT_AUTHORIZED: "This AI request is not available for this account.",
  REQUEST_CONFLICT: "This request identity cannot be reused for this submission.",
  GLOBAL_QUOTA_EXHAUSTED: "The real AI allowance for this deployment has been reached.",
  COUPLE_QUOTA_EXHAUSTED: "Your Couple account has reached its real AI allowance.",
  RATE_LIMITED: "Please wait before sending another real AI request.",
  REQUEST_ACTIVE: "A real AI request is already active for your Couple account.",
  INVALID_TRANSITION: "This request cannot start or change execution again.",
  UNSUPPORTED_TRANSACTION: "Real AI admission is temporarily unavailable.",
  ADMISSION_UNAVAILABLE: "The AI request could not be verified. Do not resend it automatically.",
};
