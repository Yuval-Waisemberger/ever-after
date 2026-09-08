import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/user";
import { getWeddingAssistantProvider, UnsupportedAssistantProviderError } from "@/lib/assistant/provider";
import { runWeddingAgent } from "@/lib/assistant/agent";
import { AssistantAdmissionError, prepareAssistantTurn, type AssistantTurnAdmission } from "@/lib/assistant/guardrails/execution";
import { evidenceSourceLabels } from "@/lib/assistant/evidence";
import { getAssistantContext } from "@/lib/queries/assistant";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { createClient } from "@/lib/supabase/server";
import { assistantRequestSchema } from "@/lib/validation/assistant";
import { assistantCopy, selectResponseLanguage, type AssistantLanguage } from "@/lib/assistant/language";

export async function POST(request: Request) {
  let language: AssistantLanguage = "en";
  let admission: AssistantTurnAdmission | undefined;
  try {
    const parsed = assistantRequestSchema.safeParse(await request.json().catch(() => null));
    if (parsed.success) language = selectResponseLanguage(parsed.data.message, parsed.data.recentLanguage, parsed.data.requestedLanguage).language;
    const copy = assistantCopy[language];
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "couple") return NextResponse.json({ error: copy.auth, errorCode: "AUTH_REQUIRED" }, { status: 401 });
    if (!parsed.success) return NextResponse.json({ error: copy.invalid, errorCode: "INVALID_INPUT" }, { status: 400 });
    // Resolve configuration before creating a conversation or persisting a message.
    const provider = getWeddingAssistantProvider();
    const supabase = await createClient();
    const wedding = await getOwnedWedding();
    let threadId = parsed.data.threadId ?? null;
    if (threadId) {
      const { data, error } = await supabase.from("assistant_threads").select("id").eq("id", threadId).eq("wedding_id", wedding.id).maybeSingle();
      if (error) return NextResponse.json({ error: copy.thread, errorCode: "THREAD_UNAVAILABLE" }, { status: 503 });
      if (!data) return NextResponse.json({ error: copy.thread, errorCode: "THREAD_UNAVAILABLE" }, { status: 404 });
    }
    admission = await prepareAssistantTurn(provider.name, {
      requestId: parsed.data.requestId, coupleId: profile.id, weddingId: wedding.id,
      threadId, message: parsed.data.message, language,
    });
    if (!threadId) {
      const { data, error } = await supabase.from("assistant_threads").insert({ wedding_id: wedding.id, title: parsed.data.message.slice(0, 80) }).select("id").single();
      if (error || !data) {
        await admission.failBeforeDispatch();
        return NextResponse.json({ error: copy.thread, errorCode: "THREAD_UNAVAILABLE" }, { status: 500 });
      }
      threadId = data.id;
    }
    const { error: userMessageError } = await supabase.from("assistant_messages").insert({ thread_id: threadId, role: "user", content: parsed.data.message, source_labels: [] });
    if (userMessageError) {
      await admission.failBeforeDispatch();
      return NextResponse.json({ error: copy.saveUser, errorCode: "MESSAGE_NOT_SAVED", threadId }, { status: 500 });
    }

    const result = await admission.execute(() => runWeddingAgent({ message: parsed.data.message, provider, loadContext: getAssistantContext, recentLanguage: parsed.data.recentLanguage, requestedLanguage: parsed.data.requestedLanguage }));
    if (result.status === "unavailable" || result.status === "error") {
      return NextResponse.json({ error: result.text, agent: result, threadId }, { status: 503 });
    }
    // Conversation persistence only. No action executor or product-data mutation exists here.
    const { data: saved, error } = await supabase.from("assistant_messages").insert({
      thread_id: threadId, role: "assistant", content: result.text,
      source_labels: evidenceSourceLabels(result.evidence), action_proposal: null,
    }).select("id, role, content, source_labels, created_at").single();
    if (error || !saved) return NextResponse.json({ error: copy.saveAnswer, errorCode: "ANSWER_NOT_SAVED" }, { status: 500 });
    return NextResponse.json({ threadId, message: saved, agent: result });
  } catch (error) {
    try { await admission?.failBeforeDispatch(); } catch { error = new AssistantAdmissionError("ADMISSION_UNAVAILABLE"); }
    if (error instanceof AssistantAdmissionError) {
      return NextResponse.json({ error: error.message, errorCode: error.code }, { status: error.httpStatus });
    }
    if (error instanceof UnsupportedAssistantProviderError) {
      return NextResponse.json({ error: assistantCopy[language].provider, errorCode: "PROVIDER_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: assistantCopy[language].error, errorCode: "REQUEST_FAILED" }, { status: 503 });
  }
}
