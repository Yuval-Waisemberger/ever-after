import { z } from "zod";
import { id } from "../tools/contracts";
import { capability, clarificationSchema, readToolName } from "./policy";

export const CONVERSATION_LIMITS = { messages: 8, perMessageCharacters: 2000, totalCharacters: 10000, vendorReferences: 4, toolReferences: 6, referenceLifetimeMs: 15 * 60 * 1000 } as const;
export const historyMessageSchema = z.object({ id, role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12000), created_at: z.iso.datetime({ offset: true }) });
// A local application-owned window, NOT an outbound provider payload. Free-form chat
// may contain voluntarily supplied PII; future semantic minimization must precede disclosure.
export function buildConversationWindow(raw: unknown, hasOlderMessages = false, relevantMessageIds?: string[]) {
  const rows = z.array(historyMessageSchema).max(CONVERSATION_LIMITS.messages).parse(raw);
  if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error("Duplicate conversation messages.");
  const newestFirst = [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));
  let remaining = CONVERSATION_LIMITS.totalCharacters;
  let omitted = 0;
  const relevant = relevantMessageIds == null ? null : z.array(id).max(CONVERSATION_LIMITS.messages).parse(relevantMessageIds);
  const selected = newestFirst.flatMap((message) => {
    // Whole-message omission preserves meaning; never silently cut a negation or quote.
    if ((relevant && !relevant.includes(message.id)) || message.content.length > CONVERSATION_LIMITS.perMessageCharacters || message.content.length > remaining) { omitted++; return []; }
    remaining -= message.content.length;
    return [{ id: message.id, role: message.role, content: message.content, createdAt: message.created_at, trust: "untrusted_conversation" as const }];
  }).reverse();
  return { messages: selected, characterCount: CONVERSATION_LIMITS.totalCharacters - remaining, omittedMessages: omitted, hasOlderMessages,
    incomplete: hasOlderMessages || omitted > 0, source: "application_history" as const, providerReady: false as const };
}
export const followUpSnapshotSchema = z.object({
  threadId: id, weddingId: id, capturedAt: z.iso.datetime(), topic: capability,
  vendorIds: z.array(id).max(CONVERSATION_LIMITS.vendorReferences).refine((values) => new Set(values).size === values.length),
  tools: z.array(z.object({ name: readToolName, status: z.enum(["success", "empty", "unavailable"]) }).strict()).max(CONVERSATION_LIMITS.toolReferences),
  clarification: clarificationSchema.nullable(),
}).strict();
// Server-owned ephemeral references only. Scope and current vendor authorization must
// be re-established by the caller; these IDs are pointers, never fresh facts or grants.
export function resolveFollowUp(raw: unknown, authorized: { threadId: string; weddingId: string; vendorIds: string[] }, knownFields: string[] = [], now = new Date()) {
  const snapshot = followUpSnapshotSchema.parse(raw);
  const age = now.getTime() - Date.parse(snapshot.capturedAt);
  if (snapshot.threadId !== authorized.threadId || snapshot.weddingId !== authorized.weddingId || age < 0 || age > CONVERSATION_LIMITS.referenceLifetimeMs) {
    return { status: "unavailable" as const, reason: "expired_or_wrong_scope" as const };
  }
  const vendorIds = snapshot.vendorIds.filter((value) => authorized.vendorIds.includes(value));
  const missingFields = snapshot.clarification?.missingFields.filter((field) => !knownFields.includes(field.field)) ?? [];
  return { status: "success" as const, topic: snapshot.topic, vendorIds, tools: snapshot.tools,
    clarification: clarificationSchema.parse({ required: missingFields.length > 0, missingFields }),
    droppedVendorReferences: snapshot.vendorIds.length - vendorIds.length, refreshToolResults: true as const };
}
