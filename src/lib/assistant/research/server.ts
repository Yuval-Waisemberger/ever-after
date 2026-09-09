import "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import { futureResearchContracts, researchToolName, type ResearchAdapter } from "./contracts";
import { normalizeResearchRequest, researchRequestKey } from "./policy";
import { logAssistantDiagnostic as diagnostic } from "../diagnostics";

export type ResearchResult = z.infer<typeof futureResearchContracts.research_current_wedding_info.outputSchema>;
export type ResearchReceipt = { tool: z.infer<typeof researchToolName>; fingerprint: string; result: ResearchResult; findingIds: string[] };
const issued = new WeakMap<object, string>();
export function isResearchReceipt(receipt: ResearchReceipt) { return issued.get(receipt) === JSON.stringify(receipt); }
export function createResearchExecutor(adapter: ResearchAdapter, deadline: number, parent: AbortSignal) {
  let used = false;
  return async (name: string, args: unknown) => {
    const tool = researchToolName.parse(name);
    const request = normalizeResearchRequest(tool, args);
    const fingerprint = createHash("sha256").update(researchRequestKey(request)).digest("hex");
    const unavailable = (reason: "SAFETY_LIMIT" | "TIMEOUT" | "SOURCE_FAILED") => ({ status: "unavailable" as const, reason, message: "Current information could not be verified. General guidance may still be offered separately.", retryable: false });
    let result: ResearchResult;
    let usage: { inputTokens: number; outputTokens: number } | undefined;
    const duration = Math.min(15000, deadline - Date.now());
    if (used || duration <= 0 || parent.aborted) result = unavailable("SAFETY_LIMIT");
    else {
      used = true;
      diagnostic({ stage: "research", outcome: "start", tool });
      const controller = new AbortController();
      const abort = () => controller.abort();
      parent.addEventListener("abort", abort, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timedOut = new Promise<never>((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error("Deadline")); }, duration);
          controller.signal.addEventListener("abort", () => reject(new Error("Deadline")), { once: true });
        });
        const raw = await Promise.race([adapter.research(request, controller.signal), timedOut]);
        const envelope = z.object({ result: z.unknown(), usage: z.object({ inputTokens: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), outputTokens: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).optional() }).strict().parse(raw);
        result = futureResearchContracts[tool].outputSchema.parse(envelope.result);
        usage = envelope.usage;
      } catch { result = unavailable(controller.signal.aborted ? "TIMEOUT" : "SOURCE_FAILED"); }
      finally { clearTimeout(timer); controller.abort(); parent.removeEventListener("abort", abort); }
      diagnostic({ stage: "research", outcome: result.status === "unavailable" ? "failure" : "success", tool, status: result.status,
        sourceCount: result.status === "unavailable" ? 0 : result.sources.length,
        findingCount: result.status === "success" || result.status === "partial" ? ("findings" in result.data ? result.data.findings.length : result.data.pricingFactors.length) : 0,
        ...(result.status === "unavailable" ? { code: result.reason === "TIMEOUT" ? "TIMEOUT" as const : "SOURCE_UNAVAILABLE" as const } : {}), ...(usage ?? {}) });
    }
    const findings = result.status === "success" || result.status === "partial" ? ("findings" in result.data ? result.data.findings : result.data.pricingFactors) : [];
    const receipt: ResearchReceipt = { tool, fingerprint, result, findingIds: findings.map((_, index) => `finding_${index + 1}`) };
    issued.set(receipt, JSON.stringify(receipt));
    return { receipt, usage };
  };
}
