import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { AssistantChat, type AssistantMessage } from "@/components/assistant/assistant-chat";
import { getLatestAssistantThread } from "@/lib/queries/assistant";

export const metadata: Metadata = { title: "Wedding Assistant" };

export default async function AssistantPage() {
  const { thread, messages } = await getLatestAssistantThread();
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Grounded in your plans" title="Wedding Assistant" description="Ask about what is due, what is booked, what remains in your budget, or how your saved vendors compare. Nothing important changes without confirmation." />
      <AssistantChat
        initialThreadId={thread?.id ?? null}
        initialMessages={messages as AssistantMessage[]}
      />
    </main>
  );
}
