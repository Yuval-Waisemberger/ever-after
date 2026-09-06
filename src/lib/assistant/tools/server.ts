import { z } from "zod";
// createClient imports next/headers: Next.js prevents this layer from entering a Client Component bundle.
import { createClient } from "@/lib/supabase/server";
import { israelCalendarDate } from "../payments";
import { errorCode, id, LIMITS, resultSchema, unavailableSchema, type ReadOutcome, type ToolEvidence } from "./contracts";
import type { ContextSection } from "../evidence";

export type ToolContext = { db: Awaited<ReturnType<typeof createClient>>; weddingId: string; now: Date; today: string };
export class ToolReadError extends Error {
  constructor(readonly code: z.output<typeof errorCode> = "SOURCE_UNAVAILABLE") { super(code); }
}
const messages: Record<z.output<typeof errorCode>, string> = {
  UNKNOWN_TOOL: "This Assistant read tool is not available.", INVALID_INPUT: "The tool request is invalid.",
  NOT_AUTHORIZED: "An authenticated Couple with an owned wedding is required.", SOURCE_UNAVAILABLE: "The requested information could not be read. Please try again.",
  INVALID_SOURCE_DATA: "The source returned incomplete or invalid information.", READ_LIMIT_EXCEEDED: "This read exceeds the tool's safe processing limit; no partial totals or ratings are returned.",
};
export function unavailable(error: unknown) {
  const code = error instanceof ToolReadError ? error.code : error instanceof z.ZodError ? "INVALID_SOURCE_DATA" : "SOURCE_UNAVAILABLE";
  return unavailableSchema.parse({ status: "unavailable", error: { code, message: messages[code], retryable: code === "SOURCE_UNAVAILABLE" }, evidence: [] });
}
async function authorize(): Promise<ToolContext> {
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new ToolReadError("NOT_AUTHORIZED");
  const userId = id.parse(data.user.id);
  const profile = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile.error) throw new ToolReadError();
  if (profile.data?.role !== "couple") throw new ToolReadError("NOT_AUTHORIZED");
  const wedding = await db.from("weddings").select("id").eq("owner_user_id", userId).maybeSingle();
  if (wedding.error) throw new ToolReadError();
  if (!wedding.data) throw new ToolReadError("NOT_AUTHORIZED");
  const now = new Date();
  return { db, weddingId: id.parse(wedding.data.id), now, today: israelCalendarDate(now) };
}

export function defineReadTool<I extends z.ZodType, O extends z.ZodType>(name: string, description: string, inputSchema: I, dataSchema: O, read: (input: z.output<I>, context: ToolContext) => Promise<ReadOutcome<z.output<O>>>) {
  const outputSchema = resultSchema(dataSchema);
  return {
    name, description, readOnly: true as const, inputSchema, outputSchema,
    async execute(rawInput: unknown) {
      const input = inputSchema.safeParse(rawInput === undefined ? {} : rawInput);
      if (!input.success) return unavailable(new ToolReadError("INVALID_INPUT"));
      try {
        const context = await authorize(); // Fresh server session and ownership on EVERY invocation.
        const result = await read(input.data, context);
        return outputSchema.parse({ status: result.empty ? "empty" : "success", data: result.data, evidence: result.evidence });
      } catch (error) { return unavailable(error); }
    },
  };
}
export type DbResult = { data: unknown; error: unknown };
export async function rows<T extends z.ZodType>(query: PromiseLike<DbResult>, schema: T, max: number): Promise<z.output<T>[]> {
  const result = await query;
  if (result.error) throw new ToolReadError();
  return z.array(schema).max(max).parse(result.data);
}
export async function one<T extends z.ZodType>(query: PromiseLike<DbResult>, schema: T): Promise<z.output<T>> {
  const result = await query;
  if (result.error) throw new ToolReadError();
  if (!result.data) throw new ToolReadError("INVALID_SOURCE_DATA");
  return schema.parse(result.data);
}
// Bounded complete reads for authoritative aggregates. An extra sentinel proves
// completion; hitting the cap returns unavailable instead of silently undercounting.
export async function allRows<T extends z.ZodType>(read: (from: number, to: number) => PromiseLike<DbResult>, schema: T, cap: number): Promise<z.output<T>[]> {
  const found: z.output<T>[] = [];
  for (let from = 0; from <= cap; from += LIMITS.batch) {
    const size = Math.min(LIMITS.batch, cap + 1 - from);
    const batch = await rows(read(from, from + size - 1), schema, size);
    found.push(...batch);
    if (found.length > cap) throw new ToolReadError("READ_LIMIT_EXCEEDED");
    if (batch.length < size) return found;
  }
  throw new ToolReadError("READ_LIMIT_EXCEEDED");
}
export function coupleEvidence(section: ContextSection): ToolEvidence { return { kind: "COUPLE_DATA", section }; }
export function marketplaceEvidence(vendorIds: string[]): ToolEvidence { return { kind: "MARKETPLACE_DATA", vendorIds, marketScope: "ever_after_marketplace_only" }; }
