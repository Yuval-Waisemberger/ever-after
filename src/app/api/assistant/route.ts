import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/user";
import { getWeddingAssistantProvider } from "@/lib/assistant/provider";
import { getAssistantContext } from "@/lib/queries/assistant";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { createClient } from "@/lib/supabase/server";
import { assistantRequestSchema } from "@/lib/validation/assistant";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "couple") return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = assistantRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a shorter, valid question." }, { status: 400 });
  const supabase = await createClient();
  const wedding = await getOwnedWedding();
  let threadId = parsed.data.threadId ?? null;
  if (threadId) {
    const { data } = await supabase.from("assistant_threads").select("id").eq("id", threadId).eq("wedding_id", wedding.id).maybeSingle();
    if (!data) threadId = null;
  }
  if (!threadId) {
    const { data, error } = await supabase.from("assistant_threads").insert({ wedding_id: wedding.id, title: parsed.data.message.slice(0, 80) }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "A conversation could not be started." }, { status: 500 });
    threadId = data.id;
  }
  await supabase.from("assistant_messages").insert({ thread_id: threadId, role: "user", content: parsed.data.message, source_labels: [] });
  const provider = getWeddingAssistantProvider();
  const response = await provider.respond({ message: parsed.data.message, context: await getAssistantContext() });
  const { data: saved, error } = await supabase.from("assistant_messages").insert({ thread_id: threadId, role: "assistant", content: response.text, source_labels: response.sources, action_proposal: response.actionProposal ?? null }).select("id, role, content, source_labels, created_at").single();
  if (error || !saved) return NextResponse.json({ error: "The answer could not be saved." }, { status: 500 });
  return NextResponse.json({ threadId, message: saved });
}
