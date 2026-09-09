import "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { FunctionTool } from "openai/resources/responses/responses";
import { assistantReadTools, executeAssistantReadTool, type AssistantReadToolName } from "./tools/registry";
import type { TurnToolRecord } from "./openai-tool-trust";
import { futureResearchContracts, researchToolName } from "./research/contracts";
import { marketplaceTaxonomyGuidance } from "./openai-instructions";

type JsonSchema = { [key: string]: unknown; properties?: Record<string, JsonSchema>; required?: string[] };
// Zod 4 retains bounds/enums. OpenAI strict mode requires every property:
// optional/defaulted inputs become nullable on the wire, then omitted for Zod.
export function strictSchema(schema: JsonSchema): JsonSchema {
  const { $schema: _dialect, default: _default, ...result } = schema;
  void _dialect; void _default;
  if (result.properties) {
    const required = new Set(result.required ?? []);
    result.properties = Object.fromEntries(Object.entries(result.properties).map(([key, value]) => {
      const child = strictSchema(value);
      return [key, required.has(key) ? child : { anyOf: [child, { type: "null" }] }];
    }));
    result.required = Object.keys(result.properties);
    result.additionalProperties = false;
  }
  if (result.items && typeof result.items === "object") result.items = strictSchema(result.items as JsonSchema);
  for (const key of ["anyOf", "oneOf", "allOf"]) if (Array.isArray(result[key])) result[key] = (result[key] as JsonSchema[]).map(strictSchema);
  return result;
}
export const openAIReadTools: FunctionTool[] = Object.entries(assistantReadTools).map(([name, tool]) => ({
  type: "function", name, description: tool.description + (name === "search_marketplace_vendors" ? `\n${marketplaceTaxonomyGuidance}` : ""), strict: true,
  parameters: strictSchema(z.toJSONSchema(tool.inputSchema, { io: "input" }) as JsonSchema),
}));

export const functionCallSchema = z.object({ type: z.literal("function_call"),
  call_id: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/), name: z.string().min(1).max(100),
  arguments: z.string().max(12000), status: z.literal("completed").optional(),
});
export type ModelFunctionCall = z.infer<typeof functionCallSchema>;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",") + "}";
  return JSON.stringify(value);
}
export function validateToolCall(call: ModelFunctionCall) {
  if (!Object.hasOwn(assistantReadTools, call.name)) throw new Error("Unsupported tool.");
  const name = call.name as AssistantReadToolName;
  const tool = assistantReadTools[name];
  const raw: unknown = JSON.parse(call.arguments);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid arguments.");
  // Drop null only for properties whose ORIGINAL contract accepts omission.
  const shape: Record<string, z.ZodType> = tool.inputSchema.shape;
  const args = Object.fromEntries(Object.entries(raw).filter(([key, value]) =>
    !(value === null && Object.hasOwn(shape, key) && shape[key].safeParse(undefined).success)));
  const input = tool.inputSchema.parse(args);
  return { call, name, input, fingerprint: createHash("sha256").update(`${name}:${canonical(input)}`).digest("hex") };
}
export type ValidatedCall = ReturnType<typeof validateToolCall>;
export async function executeValidatedCall(prepared: ValidatedCall) {
  // Sole execution channel. It authenticates and resolves the owned wedding afresh.
  const raw = await executeAssistantReadTool(prepared.name, prepared.input);
  return assistantReadTools[prepared.name].outputSchema.parse(raw);
}
export type ValidatedToolResult = Awaited<ReturnType<typeof executeValidatedCall>>;
export function toolRecord(prepared: ValidatedCall, result: ValidatedToolResult, cached: boolean): TurnToolRecord {
  return { callId: prepared.call.call_id, name: prepared.name, fingerprint: prepared.fingerprint,
    execution: cached ? "cached" : "executed", resultStatus: result.status,
    evidence: result.evidence.map(item => item.kind === "MARKETPLACE_DATA"
      ? { kind: item.kind, vendorIds: [...item.vendorIds] } : { kind: item.kind, section: item.section }),
  };
}

export const openAIResearchTools: FunctionTool[] = Object.entries(futureResearchContracts).map(([name, tool]) => ({
  type: "function", name, strict: true,
  description: "External current wedding research, not Couple records or Ever After Marketplace. Controlled public attributes only; one research invocation per turn.",
  parameters: strictSchema(z.toJSONSchema(tool.inputSchema, { io: "input" }) as JsonSchema),
}));
export function validateResearchCall(call: ModelFunctionCall) {
  const name = researchToolName.parse(call.name);
  const schema = futureResearchContracts[name].inputSchema;
  const raw: unknown = JSON.parse(call.arguments);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid research arguments.");
  const shape: Record<string, z.ZodType> = schema.shape;
  const args = Object.fromEntries(Object.entries(raw).filter(([key, value]) => !(value === null && Object.hasOwn(shape, key) && shape[key].safeParse(undefined).success)));
  return { call, name, input: schema.parse(args) };
}
