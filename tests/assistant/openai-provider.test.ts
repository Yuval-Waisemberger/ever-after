// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { OpenAIWeddingAssistantProvider } from "@/lib/assistant/openai-provider";
import * as clients from "@/lib/assistant/openai-client";
import { readOpenAIConfig } from "@/lib/assistant/openai-config";
import { openAIWeddingInstructions } from "@/lib/assistant/openai-instructions";
import { getWeddingAssistantProvider } from "@/lib/assistant/provider";
import { runWeddingAgent } from "@/lib/assistant/agent";
import { assessWeddingDomain } from "@/lib/assistant/domain-policy";
import { assistantContext } from "./fixtures";

vi.mock("next/headers", () => ({}));
const config = { apiKey: "unit-test-placeholder", model: "unit-test-model" };
let networkAttempts: string[];
beforeEach(() => {
  networkAttempts = [];
  const blocked = () => { networkAttempts.push("blocked"); throw new Error("Network forbidden, including api.openai.com"); };
  vi.stubGlobal("fetch", vi.fn(blocked));
  vi.spyOn(http, "request").mockImplementation(blocked);
  vi.spyOn(https, "request").mockImplementation(blocked);
  vi.spyOn(net.Socket.prototype, "connect").mockImplementation(blocked);
  vi.stubEnv("OPENAI_API_KEY", undefined); vi.stubEnv("OPENAI_MODEL", undefined);
});
afterEach(() => {
  try { expect(networkAttempts).toEqual([]); }
  finally { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
});

function response(text = "Allow time for invitations and RSVP replies.") {
  return { status: "completed", output: [{ type: "message", role: "assistant", status: "completed",
    content: [{ type: "output_text", text, annotations: [] }] }], usage: { input_tokens: 42, output_tokens: 18 } };
}
function harness(raw: unknown = response()) {
  const create = vi.fn().mockResolvedValue(raw);
  const factory = vi.fn(() => ({ responses: { create } }));
  const provider = new OpenAIWeddingAssistantProvider(config, factory);
  const ask = (message = "When should wedding invitations go out?", language?: "en" | "he") =>
    provider.respond({ message, context: assistantContext(), language });
  return { create, factory, provider, ask };
}

describe("configuration and client safety", () => {
  it.each([undefined, "local"])("keeps %s Local without constructing OpenAI", configured => {
    vi.stubEnv("AI_PROVIDER", configured);
    const factory = vi.spyOn(clients, "createOpenAIClient");
    expect(getWeddingAssistantProvider().name).toBe("local");
    expect(factory).not.toHaveBeenCalled();
  });
  it("selects OpenAI explicitly with validated configuration without starting a request", () => {
    vi.stubEnv("OPENAI_API_KEY", config.apiKey); vi.stubEnv("OPENAI_MODEL", config.model);
    const factory = vi.spyOn(clients, "createOpenAIClient");
    expect(getWeddingAssistantProvider("openai")).toBeInstanceOf(OpenAIWeddingAssistantProvider);
    expect(factory).not.toHaveBeenCalled();
  });
  it.each(["OPENAI_API_KEY", "OPENAI_MODEL"])("fails closed without %s and does not leak configuration", name => {
    vi.stubEnv("OPENAI_API_KEY", config.apiKey); vi.stubEnv("OPENAI_MODEL", config.model); vi.stubEnv(name, undefined);
    expect(() => getWeddingAssistantProvider("openai")).toThrow("provider configuration is unavailable");
    expect(() => readOpenAIConfig()).toThrow("provider configuration is unavailable");
  });
  it("rejects whitespace configuration and unsafe model identifiers", () => {
    vi.stubEnv("OPENAI_API_KEY", " "); vi.stubEnv("OPENAI_MODEL", "../model");
    expect(() => readOpenAIConfig()).toThrow();
  });
  it("configures the inert official SDK with no retries, a 30 second timeout and logging off", () => {
    const client = clients.createOpenAIClient(config) as OpenAI;
    expect(client).toBeInstanceOf(OpenAI);
    expect(client.maxRetries).toBe(0); expect(client.timeout).toBe(30_000); expect(client.logLevel).toBe("off");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("makes the network guard throw before any attempted API fetch", () => {
    expect(() => fetch("https://api.openai.com/v1/responses")).toThrow("Network forbidden");
    expect(networkAttempts).toEqual(["blocked"]); networkAttempts.length = 0;
  });
  it("keeps every OpenAI module behind the existing Next server-only boundary", () => {
    for (const file of ["provider", "openai-provider", "openai-config", "openai-client", "openai-instructions"]) {
      const source = readFileSync(`src/lib/assistant/${file}.ts`, "utf8");
      expect(source).toContain('import "next/headers"'); expect(source).not.toContain('"use client"');
      expect(source).not.toContain("NEXT_PUBLIC_");
    }
  });
});

describe("plain Responses API normalization", () => {
  it("returns only final English text, safe provenance and bounded usage", async () => {
    const h = harness({ ...response(), id: "private-request-id", headers: { secret: "not-for-ui" } });
    const result = await h.ask();
    expect(result).toEqual({ status: "ok", text: "Allow time for invitations and RSVP replies.", language: "en",
      evidence: [{ kind: "AI_RECOMMENDATION" }], usage: { inputTokens: 42, outputTokens: 18 } });
    const payload = h.create.mock.calls[0][0];
    expect(payload).toMatchObject({ model: config.model, max_output_tokens: 1200, store: false, stream: false });
    expect(Object.keys(payload).sort()).toEqual(["include", "input", "instructions", "max_output_tokens", "model", "store", "stream", "tool_choice", "tools"]);
    expect(payload.input).toEqual([{ role: "user", content: "When should wedding invitations go out?" }]);
    expect(JSON.stringify(payload.input)).not.toContain("weddingDate"); expect(h.create).toHaveBeenCalledTimes(1);
  });
  it("preserves Hebrew and explicit English response language", async () => {
    const h = harness(response("כדאי לתכנן את ההזמנות מראש."));
    expect((await h.ask("מתי לשלוח הזמנות לחתונה?")).language).toBe("he");
    expect(h.create.mock.calls[0][0].instructions).toContain("Respond in Hebrew");
    expect((await h.ask("מתי לשלוח הזמנות לחתונה?", "en")).language).toBe("en");
    expect(h.create.mock.calls[1][0].instructions).toContain("Respond in English");
  });
  it("discards reasoning items and never returns raw metadata", async () => {
    const h = harness({ ...response(), output: [{ type: "reasoning", summary: [{ text: "hidden deliberation" }] }, ...response().output] });
    expect(JSON.stringify(await h.ask())).not.toMatch(/hidden deliberation|summary|request.id/);
  });
  it.each([null, {}, { status: "incomplete", output: response().output }, { ...response(), output: [] },
    { ...response(), output: [{ type: "reasoning", summary: [] }] }, response(" ")])("rejects malformed/incomplete result %j", async raw => {
    expect((await harness(raw).ask()).error?.code).toBe("INVALID_PROVIDER_RESULT");
  });
  it("accepts the 10,000 boundary but rejects excess text without cutting codepoints", async () => {
    expect((await harness(response("a".repeat(10000))).ask()).text.length).toBe(10000);
    const result = await harness(response("a".repeat(9999) + "✦" + "💐")).ask();
    expect(result.error?.code).toBe("INVALID_PROVIDER_RESULT"); expect(result.text.length).toBeLessThan(10000);
    const multi = response(); multi.output.push(...response("b".repeat(10000)).output);
    expect((await harness(multi).ask()).status).toBe("error");
  });
  it.each([null, { input_tokens: -1, output_tokens: 2 }, { input_tokens: 1.5, output_tokens: 2 },
    { input_tokens: Number.MAX_SAFE_INTEGER + 1, output_tokens: 2 }])("discards unsafe optional usage %j", async usage => {
    expect((await harness({ ...response(), usage }).ask()).usage).toBeUndefined();
  });
  it.each([
    { name: "APIConnectionTimeoutError", message: "private timeout details" },
    { status: 429, message: "raw rate limit", headers: { authorization: "private" } },
    { status: 401, error: { message: "private configuration" } },
    { status: 500, body: "raw SDK body" },
  ])("normalizes failure with no retry or raw SDK error leakage: %j", async failure => {
    const h = harness(); h.create.mockRejectedValue(failure);
    expect(await h.ask()).toMatchObject({ status: "unavailable", evidence: [], error: { code: "PROVIDER_UNAVAILABLE", retryable: false } });
    expect(JSON.stringify(await h.ask())).not.toMatch(/private|raw SDK|authorization|headers/);
    expect(h.create).toHaveBeenCalledTimes(2); // two explicit calls, one dispatch each
  });
  it.each(["function_call", "web_search_call", "file_search_call", "computer_call", "mcp_call"])("rejects %s even alongside text", async type => {
    const result = await harness({ ...response(), output: [...response().output, { type, name: "list_tasks", arguments: "{}" }] }).ask();
    expect(result.error?.code).toBe("INVALID_PROVIDER_RESULT"); expect(result.evidence).toEqual([]);
  });
  it.each([
    { evidence: [{ kind: "EXTERNAL_CURRENT_EVIDENCE" }] },
    { actionProposal: { type: "create_task" } }, { toolUsage: [{ name: "list_tasks" }] },
  ])("rejects fabricated capabilities %j", async extra => {
    expect((await harness({ ...response(), ...extra }).ask()).status).toBe("error");
  });
  it("rejects research annotations", async () => {
    const raw = { ...response(), output: [{ ...response().output[0], content: [{ type: "output_text", text: "Verified online",
      annotations: [{ type: "url_citation", url: "https://example.com" }] }] }] };
    expect((await harness(raw).ask()).status).toBe("error");
  });
});

describe("wedding-wide instruction and scope contract (not live model evaluation)", () => {
  it.each(["Plan our wedding", "Wedding etiquette for invitations", "How many bridesmaids are common?",
    "What should wedding companions help with?", "How does Rabbinate registration generally work?",
    "What do you think about eight bridesmaids?"])("allows %s through existing orchestration", async message => {
    const h = harness();
    expect(assessWeddingDomain(message)).toBe("in_scope");
    const result = await runWeddingAgent({ message, provider: h.provider, loadContext: async () => assistantContext() });
    expect(result.status).toBe("ok"); expect(h.create).toHaveBeenCalledOnce();
  });
  it.each(["Explain quicksort", "Which stock should I buy?", "Help with operating systems homework", "Who won yesterday's football game?"])("rejects %s before invoking SDK", async message => {
    const h = harness(); expect((await h.ask(message)).status).toBe("out_of_scope"); expect(h.factory).not.toHaveBeenCalled();
  });
  it("instructs balanced recommendations and preserves a mock's stated tradeoffs", async () => {
    const text = "Based on your priorities, A seems stronger for photography, while B may suit a tighter budget.";
    const h = harness(response(text)); expect((await h.ask("Which wedding photographer sounds worth it?")).text).toBe(text);
    expect(h.create.mock.calls[0][0].instructions).toContain("balanced recommendations");
    expect(h.create.mock.calls[0][0].instructions).toContain("distinguish preference from fact");
  });
  it("keeps current procedures unverified and research unavailable", async () => {
    const text = "Requirements can change. I can explain the general process, but current official details should be verified.";
    const h = harness(response(text)); const result = await h.ask("What are current Rabbinate documents and fees?");
    expect(result.text).toBe(text); expect(result.evidence).toEqual([{ kind: "AI_RECOMMENDATION" }]);
    expect(h.create.mock.calls[0][0].instructions).toContain("Partial evidence requires qualification");
  });
  it("centrally prohibits writes, invented data and hidden reasoning", () => {
    const instructions = openAIWeddingInstructions("en");
    for (const rule of ["read-only", "do not create, edit, delete", "Do not invent Couple facts", "chain-of-thought", "ten internal READ tools"]) {
      expect(instructions).toContain(rule);
    }
  });
});
