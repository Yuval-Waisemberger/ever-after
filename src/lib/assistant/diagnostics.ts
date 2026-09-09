import "next/headers";
import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import { guardrailCode } from "./guardrails/contracts";

const stages = z.enum(["route", "admission", "dispatch_claim", "provider", "history_input", "model_round",
  "model_response_validation", "tool_requested", "tool_arguments", "tool_execution", "tool_serialization",
  "final_model_response", "provider_normalization", "attestation", "response_validation", "admission_finish", "assistant_persist"]);
export type DiagnosticStage = z.infer<typeof stages>;
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const eventSchema = z.object({
  stage: stages, outcome: z.enum(["start", "success", "failure"]),
  code: z.union([guardrailCode, z.enum(["AUTH_REQUIRED", "INVALID_PROVIDER_RESULT", "PROVIDER_UNAVAILABLE", "TIMEOUT", "REQUEST_FAILED", "ANSWER_NOT_SAVED",
    "UNKNOWN_TOOL", "SOURCE_UNAVAILABLE", "INVALID_SOURCE_DATA", "READ_LIMIT_EXCEEDED"])]).optional(),
  round: z.number().int().min(1).max(4).optional(), toolCount: count.optional(),
  tool: z.enum(["get_wedding_summary", "list_tasks", "get_timeline_summary", "get_budget_summary", "get_upcoming_payments",
    "get_couple_vendors", "search_marketplace_vendors", "compare_vendors", "get_guest_list_summary", "get_missing_wedding_details"]).optional(),
  status: z.enum(["success", "empty", "unavailable", "ok", "error", "out_of_scope", "completed", "uncertain", "failed"]).optional(),
  responseCharacters: count.optional(), evidenceCount: count.optional(), inputTokens: count.optional(), outputTokens: count.optional(),
});
type Event = z.input<typeof eventSchema>;
type Scope = { started: number; requestId?: string; provider?: "local" | "openai" };
const scope = new AsyncLocalStorage<Scope>();

/** No configuration, payloads, upstream errors, or network sinks. Unknown keys
 * are stripped and string metadata is allowlisted. Logging cannot affect results. */
export function logAssistantDiagnostic(event: Event): void {
  try {
    const current = scope.getStore();
    if (!current) return;
    const parsed = eventSchema.safeParse(event);
    if (!parsed.success) return;
    // One string bypasses Next.js dev file logging's lossy object formatter.
    // Serialize only validated metadata, inside the best-effort boundary.
    console.info(`assistant_diagnostic ${JSON.stringify({ ...parsed.data, requestId: current.requestId, provider: current.provider,
      elapsedMs: Math.max(0, Math.round(performance.now() - current.started)) })}`);
  } catch { /* Best effort, including a throwing console sink. */ }
}
export function identifyAssistantDiagnostic(requestId: unknown, provider?: unknown): void {
  try {
    const current = scope.getStore();
    if (!current) return;
    const id = z.uuid().safeParse(requestId);
    if (id.success) current.requestId = id.data;
    if (provider === "local" || provider === "openai") current.provider = provider;
  } catch { /* No request behavior depends on diagnostics. */ }
}
export function withAssistantDiagnostics<T>(run: () => T): T {
  // If setup itself fails, execute once without diagnostics. Never catch/replay run().
  let current: Scope;
  try { current = { started: performance.now() }; } catch { return run(); }
  let entered = false;
  try { return scope.run(current, () => { entered = true; return run(); }); }
  catch (error) { if (entered) throw error; return run(); }
}
