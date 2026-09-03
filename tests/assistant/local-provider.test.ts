import { describe, expect, it } from "vitest";
import { LocalWeddingAssistantProvider } from "@/lib/assistant/local-provider";
import type { AssistantContext } from "@/lib/assistant/types";

const context: AssistantContext = {
  wedding: { weddingDate: null, guestCount: 250, preferredArea: "central_israel", eventType: null, styles: ["Romantic"], priorities: ["Photography"], totalBudgetMinor: 18_000_000, setupStatus: "completed" },
  tasks: [{ id: "1", title: "Call the DJ", dueDate: null, status: "open", priority: "medium" }],
  vendors: [],
  budget: { committedMinor: 1_200_000, paidMinor: 300_000, availableMinor: 16_800_000, upcomingPayments: [] },
};

describe("local assistant provider", () => {
  const provider = new LocalWeddingAssistantProvider();

  it("answers account questions from Couple data", async () => {
    const response = await provider.respond({ message: "What tasks do we still need to do?", context });
    expect(response.text).toContain("1 open task");
    expect(response.sources).toEqual(["Couple data"]);
  });

  it("does not fabricate current research", async () => {
    const response = await provider.respond({ message: "What are the current legal requirements?", context });
    expect(response.text).toContain("Web research is not configured");
    expect(response.sources).not.toContain("Web research");
  });
});
