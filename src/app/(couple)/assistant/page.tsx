import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { weddingContextChips } from "@/components/assistant/presentation";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { getCoupleIdentity } from "@/lib/queries/couple-identity";
import { readAssistantHistory, readAssistantConversation } from "./history-actions";
import "./assistant.css";

export const metadata: Metadata = { title: "Wedding Assistant" };

export default async function AssistantPage() {
  const [history, wedding, identity] = await Promise.all([readAssistantHistory(), getOwnedWedding().catch(() => null), getCoupleIdentity()]);
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <AssistantChat
        coupleAvatar={{ choice: identity.avatarChoice, photoUrl: identity.photoUrl }}
        initialThreadId={null}
        initialMessages={[]}
        initialLoadError={!history || !wedding}
        initialHistory={history ?? undefined}
        readHistory={readAssistantHistory}
        readConversation={readAssistantConversation}
        contextChips={wedding ? weddingContextChips(wedding) : []}
      />
    </main>
  );
}
