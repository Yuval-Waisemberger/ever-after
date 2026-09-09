// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { OpenAIResearchAdapter } from "@/lib/assistant/research/openai-adapter";
import { createResearchExecutor, isResearchReceipt } from "@/lib/assistant/research/server";
import { normalizeResearchRequest } from "@/lib/assistant/research/policy";
import { classifySource, reviewResearchResult } from "@/lib/assistant/research/source-policy";
import { currentInfoInputSchema } from "@/lib/assistant/research/contracts";
import { attestToolResponse } from "@/lib/assistant/openai-tool-trust";
import { validateAgentResponse } from "@/lib/assistant/agent";
import { openAIReadTools, openAIResearchTools, validateResearchCall } from "@/lib/assistant/openai-tool-bridge";
import { withAssistantDiagnostics } from "@/lib/assistant/diagnostics";
import type { AssistantResponse } from "@/lib/assistant/types";

vi.mock("next/headers", () => ({}));
const now = new Date("2026-09-09T12:00:00Z");
const request = () => normalizeResearchRequest("research_current_wedding_info", { topic: "marriage_registration", aspect: "required_documents" }, now);
const source = (domain = "www.gov.il", sourceId = "s1") => ({ sourceId, origin: "external_research", domain, url: `https://${domain}/test`, title: "Synthetic source", retrievedAt: now.toISOString(), sourceType: "official", relevance: "Synthetic procedure" });
const result = () => ({ status: "success", sources: [source()], researchedAt: now.toISOString(), data: {
  topic: "marriage_registration", countryCode: "IL", findings: [{ text: "Synthetic general process; verify applicability.", sourceIds: ["s1"] }],
  quality: { confidence: "medium", explanation: "Synthetic only" }, limitations: [],
} });
const payload = (value = result()) => ({ reason: null, findings: value.data.findings.map(item => ({ ...item,
  sourceIds: item.sourceIds.map(id => value.sources.find(source => source.sourceId === id)!.url) })), quality: value.data.quality, limitations: value.data.limitations });
const response = (value = result()) => ({ status: "completed", output: [
  { type: "web_search_call", status: "completed", action: { type: "search", sources: value.sources.map(item => ({ type: "url", url: item.url })) } },
  { type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(payload(value)), annotations: value.sources.map(item => ({ type: "url_citation", url: item.url })) }] },
], usage: { input_tokens: 15, output_tokens: 5 } });
const answer = (text = "General guidance; verify current applicability. [Source](https://www.gov.il/test)"): AssistantResponse => ({ status: "ok", text, language: "en", evidence: [{ kind: "AI_RECOMMENDATION" }] });
let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  network = vi.fn(() => { throw new Error("Network forbidden"); });
  vi.stubGlobal("fetch", network); vi.spyOn(http, "request").mockImplementation(network);
  vi.spyOn(https, "request").mockImplementation(network); vi.spyOn(net.Socket.prototype, "connect").mockImplementation(network);
});
afterEach(() => { expect(network).not.toHaveBeenCalled(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("bounded research HTTP transport", () => {
  it("preserves the Phase 6C.1 cited-prose reproduction: strict output is required and noncompliance fails safely", async () => {
    // A supported API envelope, not a recording or reconstruction of the live response.
    // A provider ignoring explicit Structured Outputs must still fail safely.
    const citedText = "Synthetic procedural guidance; verify the relevant official office.";
    const raw = {
      id: "resp_synthetic", object: "response", created_at: 1788955200, status: "completed",
      output: [
        { id: "ws_synthetic", type: "web_search_call", status: "completed", action: {
          type: "search", queries: ["synthetic wedding procedure"], sources: [
            { type: "url", url: source().url }, { type: "url", url: "https://gov.il/second-synthetic" },
          ],
        } },
        { id: "msg_synthetic", type: "message", role: "assistant", status: "completed", content: [
          { type: "output_text", text: citedText, annotations: [
            { type: "url_citation", url: source().url, title: "Synthetic official source", start_index: 0, end_index: citedText.length },
          ] },
        ] },
      ], usage: { input_tokens: 15, output_tokens: 5, total_tokens: 20 },
    };
    const create = vi.fn().mockResolvedValue(raw);
    const adapter = new OpenAIResearchAdapter({ responses: { create } }, "synthetic-model");
    let parseFailure: unknown;
    // One adapter invocation: retain only the error class in test memory, then
    // allow the REAL executor to demonstrate its existing safe normalization.
    const execute = createResearchExecutor({ research: async (normalized, signal) => {
      try { return await adapter.research(normalized, signal); }
      catch (error) { parseFailure = error; throw error; }
    } }, Date.now() + 30000, new AbortController().signal);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const output = await withAssistantDiagnostics(() => execute("research_current_wedding_info", { topic: "marriage_registration", aspect: "required_documents" }));
    expect(parseFailure).toBeInstanceOf(SyntaxError); // Noncompliant output, never a prose-to-JSON repair loop.
    expect(log.mock.calls.join()).toContain('"adapterStage":"structured_output"');
    expect(output.receipt.result).toMatchObject({ status: "unavailable", reason: "SOURCE_FAILED", retryable: false });
    expect(log.mock.calls.join()).toContain('"code":"SOURCE_UNAVAILABLE"');
    expect(log.mock.calls.join()).toContain('"sourceCount":0');
    expect(create).toHaveBeenCalledOnce();
    const body = create.mock.calls[0][0];
    expect(body.include).toEqual(["web_search_call.action.sources"]);
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true });
    expect(body.max_tool_calls).toBe(1);
    expect(raw.output[0]).toHaveProperty("action.sources");
  });
  it("serializes max_tool_calls=1 through the actual SDK, with exactly one built-in capability", async () => {
    const transport = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.text.format).toMatchObject({ type: "json_schema", strict: true, schema: { additionalProperties: false } });
      expect(body.include).toEqual(["web_search_call.action.sources"]);
      expect(body.max_tool_calls).toBe(1); expect(body.tools).toHaveLength(1); expect(body.tools[0].type).toBe("web_search");
      expect(body.store).toBe(false); expect(body.stream).toBe(false); expect(body.max_output_tokens).toBe(1200);
      expect(body.input).not.toMatch(/Couple|userId|history|secret/);
      return new Response(JSON.stringify(response()), { status: 200, headers: { "content-type": "application/json" } });
    });
    const client = new OpenAI({ apiKey: "synthetic-test-placeholder", maxRetries: 0, timeout: 15000, fetch: transport });
    const adapter = new OpenAIResearchAdapter(client, "synthetic-model");
    const output = await adapter.research(request(), new AbortController().signal);
    expect(output.result.status).toBe("partial"); expect(output.usage).toEqual({ inputTokens: 15, outputTokens: 5 });
    expect(transport).toHaveBeenCalledOnce();
  });

  it("extracts action sources without requiring citation annotations or model-created source metadata", async () => {
    const raw = response(); raw.output[1].content![0].annotations = [];
    const create = vi.fn().mockResolvedValue(raw);
    const output = await new OpenAIResearchAdapter({ responses: { create } }, "mock").research(request(), new AbortController().signal);
    expect(output.result).toMatchObject({ status: "partial", sources: [{ sourceId: "source_1", url: source().url, sourceType: "official", publisher: "Israeli government" }], data: { findings: [{ sourceIds: ["source_1"] }] } });
    expect(JSON.stringify(output)).not.toContain("publishedAt");
  });
  it("binds annotation-only URLs and rejects invented or altered finding references", async () => {
    const raw = response();
    const make = (text: string) => ({ ...raw, output: [
      { type: "web_search_call", status: "completed", action: { type: "search", sources: [] } },
      { type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text, annotations: [{ type: "url_citation", url: source().url, title: "Synthetic official title" }] }] },
    ] });
    const create = vi.fn().mockResolvedValue(make(JSON.stringify(payload())));
    expect((await new OpenAIResearchAdapter({ responses: { create } }, "mock").research(request(), new AbortController().signal)).result).toMatchObject({ sources: [{ title: "Synthetic official title" }] });
    for (const url of ["https://invented.example/test", source().url + "?altered=true"]) {
      create.mockResolvedValue(make(JSON.stringify({ ...payload(), findings: [{ text: "Synthetic", sourceIds: [url] }] })));
      await expect(new OpenAIResearchAdapter({ responses: { create } }, "mock").research(request(), new AbortController().signal)).rejects.toThrow("Unverified citation");
    }
  });
  it("rejects model-created authority fields and retains a truthful insufficient result", async () => {
    for (const content of [{ ...payload(), sourceType: "official" }, { ...payload(), sources: [source()] }]) {
      const raw = response(); raw.output[1].content![0].text = JSON.stringify(content);
      await expect(new OpenAIResearchAdapter({ responses: { create: vi.fn().mockResolvedValue(raw) } }, "mock").research(request(), new AbortController().signal)).rejects.toThrow();
    }
    const raw = response(); raw.output[1].content![0].text = JSON.stringify({ ...payload(), findings: [], reason: "NO_RELEVANT_SOURCES", limitations: ["No trustworthy match."] });
    expect((await new OpenAIResearchAdapter({ responses: { create: vi.fn().mockResolvedValue(raw) } }, "mock").research(request(), new AbortController().signal)).result).toMatchObject({ status: "insufficient_evidence", sources: [] });
  });
  it("keeps nonofficial returned sources insufficient and rejects unsafe returned URLs", async () => {
    const value = { ...result(), sources: [source("blog.example")] };
    const create = vi.fn().mockResolvedValue(response(value));
    expect((await new OpenAIResearchAdapter({ responses: { create } }, "mock").research(request(), new AbortController().signal)).result).toMatchObject({ status: "insufficient_evidence", sources: [{ sourceType: "commercial_article" }] });
    for (const url of ["http://www.gov.il/test", "https://name:password@www.gov.il/test"]) {
      const raw = response({ ...result(), sources: [{ ...source(), url }] });
      create.mockResolvedValue(raw);
      await expect(new OpenAIResearchAdapter({ responses: { create } }, "mock").research(request(), new AbortController().signal)).rejects.toThrow("Unsafe source");
    }
  });
  it("normalizes benchmark content without inventing comparable source packages", async () => {
    const raw = response(); raw.output[1].content![0].text = JSON.stringify({ reason: null, quality: payload().quality, limitations: [], currency: "ILS", eventContext: [], packageAssumptions: [],
      observedRange: { lowMinor: 250000, highMinor: 310000, sourceIds: [source().url] }, typicalRange: null, pricingFactors: [] });
    const req = normalizeResearchRequest("get_market_benchmark", { purpose: "market_range", category: "photography" }, now);
    const output = await new OpenAIResearchAdapter({ responses: { create: vi.fn().mockResolvedValue(raw) } }, "mock").research(req, new AbortController().signal);
    expect(output.result).toMatchObject({ status: "insufficient_evidence", reason: "INCOMPARABLE_PACKAGES" });
  });
  it("logs only allowlisted adapter stages and counts, never source content", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await withAssistantDiagnostics(() => new OpenAIResearchAdapter({ responses: { create: vi.fn().mockResolvedValue(response()) } }, "mock").research(request(), new AbortController().signal));
    const events = log.mock.calls.map(([line]) => JSON.parse(String(line).replace("assistant_diagnostic ", "")));
    expect(events.filter(event => event.outcome === "start").map(event => event.adapterStage)).toEqual(["request", "response_received", "structured_output", "source_extraction", "source_validation", "result_validation", "completed"]);
    expect(events).toContainEqual(expect.objectContaining({ processedWebSearchCalls: 1 }));
    expect(events).toContainEqual(expect.objectContaining({ returnedSourceCount: 1 }));
    expect(events).toContainEqual(expect.objectContaining({ validatedSourceCount: 1 }));
    expect(log.mock.calls.join()).not.toMatch(/gov.il|Synthetic|sourceIds|required_documents/);
  });
  it("does not retry an HTTP error", async () => {
    const transport = vi.fn(async () => new Response("Synthetic failure", { status: 429 }));
    const adapter = new OpenAIResearchAdapter(new OpenAI({ apiKey: "synthetic-test-placeholder", maxRetries: 0, fetch: transport }), "synthetic-model");
    await expect(adapter.research(request(), new AbortController().signal)).rejects.toThrow(); expect(transport).toHaveBeenCalledOnce();
  });
  it("rejects forged URLs, unsupported tools, and more than one observed search", async () => {
    for (const extra of [{ type: "function_call", name: "write" }, { type: "web_search_call", status: "completed", action: { type: "search", sources: [] } }]) {
      const raw = response(); const create = vi.fn().mockResolvedValue({ ...raw, output: [...raw.output, extra] });
      await expect(new OpenAIResearchAdapter({ responses: { create } }, "mock").research(request(), new AbortController().signal)).rejects.toThrow();
      expect(create).toHaveBeenCalledOnce();
    }
    expect(() => reviewResearchResult(request(), result(), ["https://wrong.example/test"], now)).toThrow();
  });
});

describe("source trust, freshness and market comparability", () => {
  it.each(["http://www.gov.il/test", "https://name:password@www.gov.il/test", "https://localhost/test", "https://www.gov.il:123/test"])("rejects unsafe source %s", url => expect(() => classifySource(url)).toThrow());
  it("does not trust a provider's official classification", () => {
    const raw = { ...result(), sources: [source("blog.example")] };
    expect(reviewResearchResult(request(), raw, raw.sources.map(item => item.url), now).status).toBe("insufficient_evidence");
    expect(classifySource("https://gov.il.evil.example/test").type).toBe("commercial_article");
  });
  it("accepts official evidence conservatively without inventing publication dates", () => {
    const reviewed = reviewResearchResult(request(), result(), [source().url], now);
    expect(reviewed.status).toBe("partial"); if (reviewed.status === "unavailable") throw new Error();
    expect(reviewed.sources[0]).not.toHaveProperty("publishedAt"); expect(reviewed.sources[0]).not.toHaveProperty("updatedAt");
  });
  it("downgrades stale evidence and rejects duplicate source IDs", () => {
    expect(reviewResearchResult(request(), { ...result(), sources: [{ ...source(), publishedAt: "2020-01-01T00:00:00Z" }] }, [source().url], now).status).toBe("insufficient_evidence");
    expect(() => reviewResearchResult(request(), { ...result(), sources: [source(), source()] }, [source().url], now)).toThrow();
  });
  it("preserves conflict/insufficient states without manufacturing facts", () => {
    const raw = { status: "insufficient_evidence", reason: "CONFLICTING_SOURCES", sources: [source()], researchedAt: now.toISOString(), limitations: ["Synthetic conflicting requirements"] };
    expect(reviewResearchResult(request(), raw, [source().url], now)).toMatchObject({ status: "insufficient_evidence", reason: "CONFLICTING_SOURCES" });
  });
  it("requires comparable packages and server-reviewed independent publishers for a typical range", () => {
    const req = normalizeResearchRequest("get_market_benchmark", { purpose: "market_range", category: "photography", packageFeatures: ["full_day"] }, now);
    const sources = [source("first.example"), source("second.example", "s2")].map(item => ({ ...item, sourceType: "research_report", benchmarkContext: { category: "photography", currency: "ILS", packageFeatures: ["full_day"] } }));
    const raw = { status: "success", sources, researchedAt: now.toISOString(), data: { purpose: "market_range", category: "photography", countryCode: "IL", eventContext: [], packageAssumptions: ["full day"], currency: "ILS", observedRange: { lowMinor: 250000, highMinor: 310000, sourceIds: ["s1", "s2"] }, typicalRange: { lowMinor: 250000, highMinor: 310000, sourceIds: ["s1", "s2"] }, pricingFactors: [], quality: { confidence: "medium", explanation: "Synthetic prices" }, limitations: [] } };
    const policy = { "first.example": { publisher: "First", type: "research_report" as const }, "second.example": { publisher: "Second", type: "research_report" as const } };
    const reviewed = reviewResearchResult(req, raw, sources.map(item => item.url), now, policy);
    expect(reviewed.status).toBe("partial"); if (reviewed.status !== "partial" || !("observedRange" in reviewed.data)) throw new Error();
    expect(reviewed.data.observedRange?.lowMinor).toBe(250000); expect(raw.data.observedRange.lowMinor).toBe(250000);
    expect(reviewResearchResult(req, raw, sources.map(item => item.url), now, { ...policy, "second.example": policy["first.example"] }).status).toBe("insufficient_evidence");
    expect(reviewResearchResult(req, { ...raw, sources: [sources[0], { ...sources[1], benchmarkContext: { ...sources[1].benchmarkContext, currency: "USD" } }] }, sources.map(item => item.url), now, policy).status).toBe("insufficient_evidence");
  });
});

describe("turn-local execution and receipts", () => {
  it.each(["rawPrompt", "history", "coupleNames", "profileId", "weddingId", "guests", "taskText", "budget", "bookedVendors", "toolContext", "secret"])("rejects %s before the adapter boundary", async field => {
    const research = vi.fn();
    const execute = createResearchExecutor({ research }, Date.now() + 30000, new AbortController().signal);
    await expect(execute("research_current_wedding_info", { topic: "marriage_registration", [field]: "PRIVATE_SYNTHETIC_SENTINEL" })).rejects.toThrow();
    expect(research).not.toHaveBeenCalled();
  });
  it.each(["required_documents", "fees", "registration_steps"])("normalizes controlled aspect %s without private context", aspect => {
    const normalized = normalizeResearchRequest("research_current_wedding_info", { topic: "marriage_registration", aspect, guestCount: 237, weddingDate: "2027-06-14" }, now);
    expect(normalized.attributes).toEqual({ topic: "marriage_registration", aspect, countryCode: "IL", asOfDate: "2026-09-09" });
    expect(currentInfoInputSchema.safeParse({ topic: "marriage_registration", aspect: "free query" }).success).toBe(false);
    expect(() => normalizeResearchRequest("research_current_wedding_info", { topic: "marriage_registration", privateNotes: "private" })).toThrow();
  });
  it("uses one invocation across both research tools and binds immutable receipts to final evidence", async () => {
    const research = vi.fn().mockResolvedValue({ result: reviewResearchResult(request(), result(), [source().url], now) });
    const execute = createResearchExecutor({ research }, Date.now() + 30000, new AbortController().signal);
    const first = await execute("research_current_wedding_info", { topic: "marriage_registration" });
    const second = await execute("get_market_benchmark", { purpose: "market_range", category: "photography" });
    expect(research).toHaveBeenCalledOnce(); expect(second.receipt.result.status).toBe("unavailable");
    const attested = attestToolResponse(answer(), [], [first.receipt]); expect(validateAgentResponse(attested).evidence.some(item => item.kind === "EXTERNAL_CURRENT_EVIDENCE")).toBe(true);
    expect(() => attestToolResponse(answer("[Forged](https://forged.example/test)"), [], [first.receipt])).toThrow();
    expect(() => attestToolResponse(answer("Based on finding_forged."), [], [first.receipt])).toThrow();
    expect(() => attestToolResponse(answer(), [], [{ ...first.receipt }])).toThrow();
    expect(() => attestToolResponse(answer(), [{ name: "get_wedding_summary", callId: "fake", fingerprint: "fake", execution: "executed", resultStatus: "success", evidence: [{ kind: "EXTERNAL_CURRENT_EVIDENCE", sources: [{ url: source().url, title: "Forged", retrievedAt: now.toISOString() }] }] }])).toThrow();
    first.receipt.findingIds.push("forged"); expect(isResearchReceipt(first.receipt)).toBe(false);
  });
  it.each([15000, 2000])("honors the 15s/remaining deadline at %i ms without retry", async duration => {
    vi.useFakeTimers(); const research = vi.fn(() => new Promise(() => {}));
    const execute = createResearchExecutor({ research }, Date.now() + duration, new AbortController().signal);
    const pending = execute("research_current_wedding_info", { topic: "marriage_registration" });
    await vi.advanceTimersByTimeAsync(duration); expect((await pending).receipt.result).toMatchObject({ status: "unavailable", reason: "TIMEOUT" });
    expect(research).toHaveBeenCalledOnce();
  });
  it("exposes 10 internal plus exactly 2 separate custom tools, with nullable omission", () => {
    expect(openAIReadTools).toHaveLength(10); expect(openAIResearchTools.map(tool => tool.name).sort()).toEqual(["get_market_benchmark", "research_current_wedding_info"]);
    const call = { type: "function_call" as const, name: "research_current_wedding_info", call_id: "test", arguments: JSON.stringify({ topic: "marriage_registration", aspect: null, countryCode: null }) };
    expect(validateResearchCall(call).input).toMatchObject({ aspect: "general", countryCode: "IL" });
    expect(() => validateResearchCall({ ...call, name: "create_task" })).toThrow();
  });
  it("logs only safe research metadata and tolerates a throwing sink", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const execute = createResearchExecutor({ research: vi.fn().mockResolvedValue({ result: reviewResearchResult(request(), result(), [source().url], now) }) }, Date.now() + 30000, new AbortController().signal);
    await withAssistantDiagnostics(() => execute("research_current_wedding_info", { topic: "marriage_registration" }));
    expect(log.mock.calls.join()).toContain('"sourceCount":1'); expect(log.mock.calls.join()).not.toMatch(/gov\.il|Synthetic|marriage_registration/);
    log.mockImplementation(() => { throw new Error("sink"); });
    await expect(withAssistantDiagnostics(() => execute("research_current_wedding_info", { topic: "marriage_registration" }))).resolves.toBeDefined();
  });
});
