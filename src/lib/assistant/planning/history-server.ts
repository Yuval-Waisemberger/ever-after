import { createClient } from "@/lib/supabase/server";
import { id } from "../tools/contracts";
import { buildConversationWindow, CONVERSATION_LIMITS } from "./conversation";

// Opt-in future server reader; not called by the current Local API or registered as a tool.
// Ownership is resolved afresh. No writes, summaries, external memory or provider calls.
export async function readConversationWindow(rawThreadId: unknown) {
  const threadId = id.safeParse(rawThreadId);
  if (!threadId.success) return { status: "unavailable" as const, reason: "invalid_input" as const };
  try {
    const db = await createClient();
    const user = await db.auth.getUser();
    if (user.error || !user.data.user) return { status: "unavailable" as const, reason: "not_authorized" as const };
    const profile = await db.from("profiles").select("role").eq("id", user.data.user.id).maybeSingle();
    if (profile.error) throw new Error("read_failed");
    if (profile.data?.role !== "couple") return { status: "unavailable" as const, reason: "not_authorized" as const };
    const wedding = await db.from("weddings").select("id").eq("owner_user_id", user.data.user.id).maybeSingle();
    if (wedding.error) throw new Error("read_failed");
    if (!wedding.data) return { status: "unavailable" as const, reason: "not_authorized" as const };
    const thread = await db.from("assistant_threads").select("id").eq("id", threadId.data).eq("wedding_id", wedding.data.id).maybeSingle();
    if (thread.error) throw new Error("read_failed");
    if (!thread.data) return { status: "unavailable" as const, reason: "not_authorized" as const };
    const messages = await db.from("assistant_messages").select("id, role, content, created_at")
      .eq("thread_id", threadId.data).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(CONVERSATION_LIMITS.messages + 1);
    if (messages.error || !messages.data || messages.data.length > CONVERSATION_LIMITS.messages + 1) throw new Error("read_failed");
    const data = buildConversationWindow(messages.data.slice(0, CONVERSATION_LIMITS.messages), messages.data.length > CONVERSATION_LIMITS.messages);
    return { status: messages.data.length ? "success" as const : "empty" as const, data };
  } catch { return { status: "unavailable" as const, reason: "source_unavailable" as const }; }
}
