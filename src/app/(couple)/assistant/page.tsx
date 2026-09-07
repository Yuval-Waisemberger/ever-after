import type { Metadata } from "next";
import { AssistantChat, type AssistantMessage } from "@/components/assistant/assistant-chat";
import { getLatestAssistantThread } from "@/lib/queries/assistant";

export const metadata: Metadata = { title: "Wedding Assistant" };

export default async function AssistantPage() {
  const history = await getLatestAssistantThread().catch(() => null);
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <AssistantChat
        initialThreadId={history?.thread?.id ?? null}
        initialMessages={(history?.messages ?? []) as AssistantMessage[]}
        initialLoadError={!history}
      />
    </main>
  );
}
