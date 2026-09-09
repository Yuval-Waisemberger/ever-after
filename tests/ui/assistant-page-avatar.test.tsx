import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({ identity: vi.fn() }));
vi.mock("@/lib/queries/couple-identity", () => ({ getCoupleIdentity: mocks.identity }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: async () => ({}) }));
vi.mock("@/app/(couple)/assistant/history-actions", () => ({ readAssistantHistory: async () => ({ threads: [], hasMore: false }), readAssistantConversation: vi.fn() }));
import AssistantPage from "@/app/(couple)/assistant/page";

beforeEach(() => mocks.identity.mockReset());
describe("Assistant page avatar privacy", () => {
  for (const photoUrl of ["/fixture-couple.png", null]) it(`passes only avatar presentation fields (${photoUrl ? "photo" : "fallback"})`, async () => {
    mocks.identity.mockResolvedValue({ avatarChoice: "heart", photoUrl, profileId: "private-id", displayName: "private-name", avatarStoragePath: "private-path" });
    const page = await AssistantPage();
    const chat = page.props.children as ReactElement<{ coupleAvatar: unknown }>;
    expect(chat.props.coupleAvatar).toEqual({ choice: "heart", photoUrl });
    expect(JSON.stringify(chat.props)).not.toMatch(/private-id|private-name|private-path/);
    expect(mocks.identity).toHaveBeenCalledTimes(1);
  });
});
