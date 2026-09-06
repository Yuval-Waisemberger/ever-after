import { afterEach, describe, expect, it, vi } from "vitest";
import { getWeddingAssistantProvider, UnsupportedAssistantProviderError } from "@/lib/assistant/provider";
import { assessWeddingDomain } from "@/lib/assistant/domain-policy";
import { evidenceSchema, evidenceSourceLabels } from "@/lib/assistant/evidence";
import { prepareAssistantContext } from "@/lib/assistant/privacy";
import { runWeddingAgent, validateAgentResponse } from "@/lib/assistant/agent";
import { AssistantContextUnavailableError } from "@/lib/assistant/context-error";
import { assistantResponseSchema } from "@/lib/assistant/types";
import { assistantContext, assistantVendor } from "./fixtures";

const recommendation = { status: "ok" as const, text: "Here is a wedding suggestion.", evidence: [{ kind: "AI_RECOMMENDATION" as const }] };
afterEach(() => vi.unstubAllEnvs());

describe("provider selection", () => {
  it("selects the configured local adapter", () => {
    vi.stubEnv("AI_PROVIDER", "local");
    expect(getWeddingAssistantProvider().name).toBe("local");
  });
  it("defaults missing configuration to local, including production", () => {
    vi.stubEnv("AI_PROVIDER", undefined); vi.stubEnv("NODE_ENV", "production");
    expect(getWeddingAssistantProvider().name).toBe("local");
  });
  it.each(["openai", "another-provider", "", "LOCAL", " local "])("rejects explicit unsupported configuration %s", (value) => {
    vi.stubEnv("AI_PROVIDER", value);
    expect(() => getWeddingAssistantProvider()).toThrow(UnsupportedAssistantProviderError);
  });
});

describe("central domain policy", () => {
  it.each(["Help me write a message to my photographer", "Plan our wedding roadmap", "Compare wedding vendors", "Wedding etiquette for guests", "Wedding day logistics", "Find a wedding venue", "How are our RSVPs?", "Wedding inspiration", "What legal paperwork is needed for a wedding?"])("allows %s", (message) => {
    expect(assessWeddingDomain(message)).toBe("in_scope");
  });
  it.each(["Diagnose this rash before my wedding", "Trade bitcoin to fund my wedding", "Write JavaScript for my wedding website", "Do my homework", "What is the capital of France?", "Give me investment advice", "Explain politics", "Give me unrelated legal conclusions", "I need relationship advice", "Search the internet for general knowledge"])("redirects %s", (message) => {
    expect(assessWeddingDomain(message)).toBe("out_of_scope");
  });
  it("does not reject an unknown language or natural follow-up based on language", () => {
    expect(assessWeddingDomain("אפשר לעזור עם החתונה שלנו?")).toBe("uncertain");
    expect(assessWeddingDomain("Tell me more")).toBe("uncertain");
  });
  it("blocks before context loading and before any provider is called", async () => {
    const provider = { name: "test-adapter", respond: vi.fn() };
    const loadContext = vi.fn();
    const result = await runWeddingAgent({ message: "Diagnose this rash before my wedding", provider, loadContext });
    expect(result.status).toBe("out_of_scope");
    expect(result.text).toContain("wedding planning");
    expect(provider.respond).not.toHaveBeenCalled();
    expect(loadContext).not.toHaveBeenCalled();
  });
});

describe("evidence and result trust boundary", () => {
  it("distinguishes all four evidence kinds and preserves legacy display labels", () => {
    const evidence = [
      { kind: "COUPLE_DATA", section: "budget" },
      { kind: "MARKETPLACE_DATA", vendorIds: ["marketplace-vendor"] },
      { kind: "EXTERNAL_CURRENT_EVIDENCE", sources: [{ url: "https://example.com/source", title: "Source", retrievedAt: "2026-09-07T00:00:00Z" }] },
      { kind: "AI_RECOMMENDATION" },
    ].map((item) => evidenceSchema.parse(item));
    expect(evidenceSourceLabels(evidence)).toEqual(["Couple data", "Internal vendor database", "Web research", "General guidance"]);
    expect(evidenceSchema.safeParse({ kind: "EXTERNAL_CURRENT_EVIDENCE", sources: [] }).success).toBe(false);
  });
  it("rejects Marketplace claims about external or absent vendors", () => {
    const context = assistantContext(); context.vendors = [assistantVendor({ source: "external" })];
    expect(() => validateAgentResponse({ ...recommendation, evidence: [{ kind: "MARKETPLACE_DATA", vendorIds: ["vendor-id"] }] }, context)).toThrow();
    expect(() => validateAgentResponse({ ...recommendation, evidence: [{ kind: "MARKETPLACE_DATA", vendorIds: ["another-couple-vendor"] }] }, context)).toThrow();
    context.vendors = [assistantVendor()];
    expect(validateAgentResponse({ ...recommendation, evidence: [{ kind: "MARKETPLACE_DATA", vendorIds: ["vendor-id"] }] }, context).status).toBe("ok");
  });
  it("rejects claimed research, tool execution and action proposals in Phase 1A", () => {
    for (const extra of [
      { evidence: [{ kind: "EXTERNAL_CURRENT_EVIDENCE", sources: [{ url: "https://example.com", title: "Unverified", retrievedAt: "2026-09-07T00:00:00Z" }] }] },
      { toolUsage: [{ name: "create_task", status: "succeeded" }] },
      { actionProposal: { type: "book_vendor", summary: "Book", arguments: { id: "vendor-id" }, requiresConfirmation: true } },
    ]) expect(() => validateAgentResponse({ ...recommendation, ...extra }, assistantContext())).toThrow();
  });
  it("validates unavailable states and keeps metadata language neutral", () => {
    expect(assistantResponseSchema.safeParse({ ...recommendation, status: "unavailable" }).success).toBe(false);
    expect(assistantResponseSchema.safeParse({ ...recommendation, sources: ["Invented"] }).success).toBe(false);
    expect(assistantResponseSchema.parse({ ...recommendation, text: "בואו נתכנן חתונה", clarification: { question: "מה התאריך?", missingFields: ["weddingDate"] }, usage: { inputTokens: 10 } }).text).toContain("חתונה");
  });
  it("converts provider exceptions and invalid outputs into safe non-factual results", async () => {
    const provider = { name: "fake", respond: vi.fn().mockRejectedValue(new Error("secret internal error")) };
    const args = { message: "Plan my wedding", provider, loadContext: async () => assistantContext() };
    expect((await runWeddingAgent(args)).error?.code).toBe("PROVIDER_UNAVAILABLE");
    provider.respond.mockResolvedValue({ text: "invented" });
    expect((await runWeddingAgent(args)).error?.code).toBe("INVALID_PROVIDER_RESULT");
  });
});

describe("privacy and unavailable context", () => {
  it("strips forbidden nested fields before any adapter sees context", async () => {
    const original = assistantContext();
    const dirty = {
      ...original, credentials: "secret", token: "secret",
      wedding: { ...original.wedding, phone: "private", secondaryEmail: "private", password: "secret" },
      tasks: [{ ...original.tasks[0], notes: "private" }],
      guestList: { ...original.guestList, names: ["private"], phone: "private", email: "private", dietaryNotes: "private", privateNotes: "private" },
      vendors: [{ ...assistantVendor(), phone: "private", email: "private", websiteUrl: "private", privateNotes: "private", notes: "private" }],
    };
    const clean = prepareAssistantContext(dirty);
    expect(JSON.stringify(clean)).not.toMatch(/private|secret/);
    const provider = { name: "fake", respond: vi.fn().mockResolvedValue(recommendation) };
    await runWeddingAgent({ message: "Compare wedding vendors", provider, loadContext: async () => dirty });
    expect(provider.respond).toHaveBeenCalledWith({ message: "Compare wedding vendors", context: clean });
  });
  it.each(["vendors", "budget", "tasks", "guestList", "wedding"] as const)("does not generate facts after a %s read failure", async (section) => {
    const provider = { name: "fake", respond: vi.fn() };
    const result = await runWeddingAgent({ message: "What is our wedding budget?", provider, loadContext: async () => { throw new AssistantContextUnavailableError(section); } });
    expect(result.status).toBe("unavailable"); expect(result.evidence).toEqual([]);
    expect(result.text).toContain("couldn't access"); expect(result.text).not.toContain("0");
    expect(provider.respond).not.toHaveBeenCalled();
  });
});
