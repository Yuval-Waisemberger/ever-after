import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { benchmarkInputSchema, benchmarkResultSchema, currentInfoInputSchema, currentInfoResultSchema, futureResearchContracts, researchSourceSchema, unavailableResearchResult } from "@/lib/assistant/research/contracts";
import { assessResearchEligibility, currentMarketClaimPolicy, normalizeResearchRequest, normalizedResearchRequestSchema, researchRequestKey, FUTURE_RESEARCH_COST_POLICY } from "@/lib/assistant/research/policy";
import { validateAnswerProvenance, validateResearchProvenance } from "@/lib/assistant/research/provenance";
import { evidenceSchema, evidenceSourceLabels } from "@/lib/assistant/evidence";
import { validateAgentResponse } from "@/lib/assistant/agent";
import { assistantContext } from "./fixtures";

const now = new Date("2026-09-07T12:00:00Z");
const input = { purpose: "service_quote", category: "photography", quotedPrice: { amountMinor: 2, currency: "ILS" } };
// Deliberately synthetic contract fixtures in minor units, not wedding-market guidance.
const source = (sourceId = "s1", domain = "first.example") => ({
  sourceId, origin: "external_research", url: `https://${domain}/synthetic-fixture`, domain,
  title: "Synthetic validation fixture", publisher: "Fixture publisher", sourceType: "research_report",
  retrievedAt: "2026-09-07T11:00:00Z", relevance: "Schema testing only",
});
const successful = () => ({
  status: "success", researchedAt: "2026-09-07T11:30:00Z", sources: [source(), source("s2", "second.example")],
  data: { purpose: "service_quote", category: "photography", countryCode: "IL", eventContext: [], packageAssumptions: [],
    quotedPrice: input.quotedPrice, currency: "ILS", observedRange: { lowMinor: 1, highMinor: 3, sourceIds: ["s1", "s2"] },
    typicalRange: { lowMinor: 1, highMinor: 2, sourceIds: ["s1", "s2"] }, pricingFactors: [{ text: "Synthetic finding", sourceIds: ["s1"] }],
    quality: { confidence: "medium", explanation: "Synthetic evidence for validation" }, limitations: [] },
});
const receipt = (value: ReturnType<typeof successful>) => ({ researchedAt: value.researchedAt, sources: value.sources });

describe("future research contracts", () => {
  it("accepts minimal service and whole-wedding requests without inventing optional context", () => {
    expect(benchmarkInputSchema.parse({ purpose: "market_range", category: "music" })).toEqual({ purpose: "market_range", category: "music", countryCode: "IL", packageFeatures: [] });
    expect(benchmarkInputSchema.parse({ purpose: "overall_budget" })).not.toHaveProperty("quotedPrice");
    expect(benchmarkInputSchema.parse(input).quotedPrice).toEqual(input.quotedPrice);
  });
  it.each([
    { purpose: "service_quote" }, { ...input, quotedPrice: { amountMinor: -1, currency: "ILS" } },
    { ...input, quotedPrice: { amountMinor: 2 } }, { ...input, guestCount: 0 },
    { ...input, category: "trading" }, { ...input, weddingDate: "not-a-date" }, { ...input, countryCode: "not-a-country" },
  ])("rejects invalid benchmark input %j", (value) => expect(benchmarkInputSchema.safeParse(value).success).toBe(false));
  it("restricts non-price research to structured wedding topics", () => {
    expect(currentInfoInputSchema.parse({ topic: "marriage_registration" }).topic).toBe("marriage_registration");
    for (const value of [{ topic: "politics" }, { topic: "programming" }, { topic: "diagnose_rash" }, { topic: "wedding_procedures", query: "Who should I vote for?" }]) {
      expect(currentInfoInputSchema.safeParse(value).success).toBe(false);
    }
  });
  it("validates complete benchmark and non-price results", () => {
    expect(benchmarkResultSchema.parse(successful()).status).toBe("success");
    expect(currentInfoResultSchema.parse({ status: "success", researchedAt: "2026-09-07T11:30:00Z", sources: [source()], data: {
      topic: "marriage_registration", countryCode: "IL", findings: [{ text: "Synthetic procedural finding", sourceIds: ["s1"] }], quality: { confidence: "medium", explanation: "Official procedure would require current official evidence" }, limitations: [],
    } }).status).toBe("success");
    expect(currentInfoResultSchema.safeParse(successful()).success).toBe(false);
  });
  it("requires grounded ranges, source references, quality and partial-result limitations", () => {
    const valid = successful();
    for (const value of [
      { ...valid, sources: [] }, { ...valid, sources: [...valid.sources, source()] },
      { ...valid, data: { ...valid.data, observedRange: { lowMinor: 3, highMinor: 1, sourceIds: ["s1"] } } },
      { ...valid, data: { ...valid.data, typicalRange: { lowMinor: 1, highMinor: 2, sourceIds: ["invented"] } } },
      { ...valid, data: { ...valid.data, typicalRange: { lowMinor: 1, highMinor: 2, sourceIds: ["s1"] } } },
      { ...valid, data: { ...valid.data, observedRange: null } },
      { ...valid, data: { ...valid.data, quality: { confidence: "low", explanation: "Insufficient" } } },
      { ...valid, status: "partial" },
    ]) expect(benchmarkResultSchema.safeParse(value).success).toBe(false);
    expect(benchmarkResultSchema.parse({ ...valid, status: "partial", data: { ...valid.data, typicalRange: null, limitations: ["Sources disagree on package scope"] } }).status).toBe("partial");
  });
  it("does not invent prices, timestamps or sources while disabled", () => {
    const result = unavailableResearchResult();
    for (const definition of Object.values(futureResearchContracts)) {
      expect(definition.live).toBe(false); expect(definition).not.toHaveProperty("execute");
      expect(definition.outputSchema.parse(result)).toEqual(result);
      expect(definition.outputSchema.safeParse({ ...result, data: successful().data }).success).toBe(false);
      expect(definition.outputSchema.safeParse({ ...result, sources: [source()], researchedAt: now.toISOString() }).success).toBe(false);
    }
    expect(result).toMatchObject({ status: "unavailable", reason: "RESEARCH_DISABLED", retryable: false });
    expect(result).not.toHaveProperty("data"); expect(result).not.toHaveProperty("researchedAt"); expect(result).not.toHaveProperty("sources");
  });
  it("keeps insufficient evidence distinct from disabled research and forbids numeric data", () => {
    const result = { status: "insufficient_evidence", reason: "NO_RELEVANT_SOURCES", researchedAt: "2026-09-07T11:30:00Z", sources: [], limitations: ["No comparable sources"] };
    expect(benchmarkResultSchema.parse(result).status).toBe("insufficient_evidence");
    expect(benchmarkResultSchema.safeParse({ ...result, data: successful().data }).success).toBe(false);
    expect(benchmarkResultSchema.safeParse({ ...result, observedRange: { lowMinor: 1, highMinor: 3 } }).success).toBe(false);
  });
});

describe("research eligibility and current claims", () => {
  it.each([
    ["What tasks are due this week?", "couple_records", "internal_only"],
    ["Which photographers have I saved?", "couple_records", "internal_only"],
    ["Which saved photographer fits us best?", "personalized_vendor_comparison", "internal_only"],
    ["Is this photographer quote reasonable?", "market_benchmark", "benchmark"],
    ["Is our wedding budget realistic?", "market_benchmark", "benchmark"],
    ["Current wedding registration requirements", "current_wedding_information", "current_info"],
    ["Romantic ceremony ideas", "wedding_ideas", "general_guidance"],
    ["Draft a message to our photographer", "wedding_drafting", "general_guidance"],
  ])("constrains structured intent for %s", (_, purpose, route) => {
    // Examples label intent, not assertions that this policy performs NLP.
    const decision = assessResearchEligibility({ domain: "in_scope", purpose });
    expect(decision.route).toBe(route); expect(decision.liveResearchAvailable).toBe(false);
  });
  it("redirects unrelated intent and requires clarification for uncertain scope", () => {
    expect(assessResearchEligibility({ domain: "out_of_scope", purpose: "current_wedding_information" })).toMatchObject({ route: "redirect", eligibleTool: null });
    expect(assessResearchEligibility({ domain: "uncertain", purpose: "market_benchmark" })).toMatchObject({ route: "clarify", eligibleTool: null });
  });
  it.each(["price", "market", "location", "procedure", "regulation", "time_sensitive"])("requires current evidence for %s claims", (sensitivity) => {
    const decision = assessResearchEligibility({ domain: "in_scope", purpose: "wedding_ideas", currentClaimSensitivities: [sensitivity] });
    expect(decision.eligibleTool).not.toBeNull();
    for (const state of ["unavailable", "insufficient_evidence", "unverified"] as const) expect(currentMarketClaimPolicy([sensitivity], state)).toMatchObject({ canAssertCurrentFact: false, mustDiscloseUnverified: true, generalGuidanceLabel: "AI_RECOMMENDATION" });
    expect(currentMarketClaimPolicy([sensitivity], "partial_current")).toMatchObject({ canAssertCurrentFact: true, mustQualify: true });
  });
  it("keeps stored budget facts internal even when they contain prices", () => {
    expect(assessResearchEligibility({ domain: "in_scope", purpose: "couple_records", currentClaimSensitivities: ["price"] }).route).toBe("internal_only");
  });
});

describe("research privacy and cost preparation", () => {
  it("uses normalized attributes, coarse context and no private offer text", () => {
    const result = normalizeResearchRequest("get_market_benchmark", { ...input, region: "central_israel", guestCount: 237, weddingDate: "2026-12-17", offerDescription: "PRIVATE_SENTINEL name phone email vendor notes", packageFeatures: ["video", "full_day", "video"] }, now);
    expect(result.attributes).toMatchObject({ guestScale: { lower: 201, upper: 250 }, weddingMonth: "2026-12", asOfDate: "2026-09-07", packageFeatures: ["full_day", "video"] });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_SENTINEL|237|2026-12-17|offerDescription/);
  });
  it.each(["name", "phone", "email", "guestNames", "privateNotes", "vendorNotes", "wedding_id", "user_id", "token"])("rejects private field %s rather than forwarding it", (field) => {
    expect(() => normalizeResearchRequest("get_market_benchmark", { ...input, [field]: "PRIVATE_SENTINEL" }, now)).toThrow();
    const request = normalizeResearchRequest("get_market_benchmark", input, now);
    expect(normalizedResearchRequestSchema.safeParse({ ...request, attributes: { ...request.attributes, [field]: "PRIVATE_SENTINEL" } }).success).toBe(false);
  });
  it("omits irrelevant event context for procedures and canonicalizes equivalent requests", () => {
    const request = normalizeResearchRequest("research_current_wedding_info", { topic: "marriage_registration", guestCount: 250, weddingDate: "2026-12-17", eventType: "evening" }, now);
    expect(request.attributes).toEqual({ countryCode: "IL", topic: "marriage_registration", aspect: "general", asOfDate: "2026-09-07" });
    const first = normalizeResearchRequest("get_market_benchmark", { ...input, packageFeatures: ["video", "full_day", "video"] }, now);
    const second = normalizeResearchRequest("get_market_benchmark", { ...input, packageFeatures: ["full_day", "video"] }, now);
    expect(researchRequestKey(first)).toBe(researchRequestKey(second));
    expect(FUTURE_RESEARCH_COST_POLICY).toMatchObject({ maxCallsPerMessage: 1, maxSourcesPerCall: 8, timeoutMs: 15000, automaticProviderFallback: false });
  });
});

describe("source and statement provenance", () => {
  it("compares source chronology by instant across different timestamp precision", () => {
    expect(researchSourceSchema.safeParse({ ...source(), publishedAt: "2026-09-07T11:00:00Z", retrievedAt: "2026-09-07T11:00:00.001Z" }).success).toBe(true);
    const result = successful();
    expect(benchmarkResultSchema.safeParse({ ...result, researchedAt: "2026-09-07T11:00:00.001Z" }).success).toBe(true);
    expect(benchmarkResultSchema.safeParse({ ...result, sources: [{ ...source(), retrievedAt: "2026-09-07T11:30:00.001Z" }, result.sources[1]] }).success).toBe(false);
  });
  it.each([
    { origin: "MARKETPLACE_DATA" }, { url: "not-a-url" }, { url: "http://first.example/source" }, { domain: "wrong.example" },
    { publishedAt: "2026-10-01T00:00:00Z" }, { retrievedAt: "not-a-date" }, { url: "https://user:password@first.example/source" },
  ])("rejects invalid source metadata %j", (extra) => expect(researchSourceSchema.safeParse({ ...source(), ...extra }).success).toBe(false));
  it("binds sources, timestamps and quoted context to trusted server records", () => {
    const result = successful(); const request = normalizeResearchRequest("get_market_benchmark", input, now);
    expect(validateResearchProvenance(request, result, receipt(result), now).status).toBe("success");
    expect(() => validateResearchProvenance(request, result, { ...receipt(result), sources: [] }, now)).toThrow();
    expect(() => validateResearchProvenance(request, { ...result, researchedAt: "2026-09-08T00:00:00Z" }, receipt(result), now)).toThrow();
    expect(() => validateResearchProvenance(request, { ...result, sources: [{ ...source(), title: "Invented title" }, result.sources[1]] }, receipt(result), now)).toThrow();
    expect(() => validateResearchProvenance(request, { ...result, data: { ...result.data, quotedPrice: { amountMinor: 3, currency: "ILS" } } }, receipt(result), now)).toThrow();
    expect(validateResearchProvenance(request, unavailableResearchResult(), undefined, now).status).toBe("unavailable");
  });
  const ledger = [
    { id: "couple", evidence: { kind: "COUPLE_DATA", section: "budget" } },
    { id: "marketplace", evidence: { kind: "MARKETPLACE_DATA", vendorIds: ["vendor"] } },
    { id: "external", evidence: { kind: "EXTERNAL_CURRENT_EVIDENCE", sources: [{ url: "https://first.example/source", title: "Synthetic", retrievedAt: "2026-09-07T11:00:00Z" }] } },
    { id: "advice", evidence: { kind: "AI_RECOMMENDATION" } },
  ];
  it("preserves four evidence classes within a mixed-source answer", () => {
    const claims = ledger.map((entry) => ({ text: "Synthetic statement", kind: entry.evidence.kind, basis: [{ evidenceId: entry.id, kind: entry.evidence.kind }] }));
    claims[3].basis.push({ evidenceId: "couple", kind: "COUPLE_DATA" });
    expect(validateAnswerProvenance(claims, ledger)).toHaveLength(4);
    expect(evidenceSourceLabels(ledger.map((entry) => evidenceSchema.parse(entry.evidence)))).toHaveLength(4);
  });
  it.each([["marketplace", "EXTERNAL_CURRENT_EVIDENCE"], ["advice", "COUPLE_DATA"], ["advice", "EXTERNAL_CURRENT_EVIDENCE"]])("prevents relabelling %s as %s", (id, kind) => {
    expect(() => validateAnswerProvenance([{ text: "Synthetic claim", kind, basis: [{ evidenceId: id, kind }] }], ledger)).toThrow();
  });
  it("keeps research and tool execution disabled in the existing Local response path", () => {
    expect(() => validateAgentResponse({ status: "ok", text: "Claimed research", evidence: [ledger[2].evidence] }, assistantContext())).toThrow("Research is disabled");
    const registry = readFileSync("src/lib/assistant/tools/registry.ts", "utf8");
    expect(registry).not.toMatch(/get_market_benchmark|research_current_wedding_info/);
    expect([...registry.matchAll(/^  ([a-z_]+):/gm)].map((match) => match[1])).toEqual(["get_wedding_summary", "list_tasks", "get_timeline_summary", "get_budget_summary", "get_upcoming_payments", "get_couple_vendors", "search_marketplace_vendors", "compare_vendors", "get_guest_list_summary", "get_missing_wedding_details"]);
    for (const file of readdirSync("src/lib/assistant/research")) {
      const code = readFileSync(`src/lib/assistant/research/${file}`, "utf8");
      expect(code).not.toMatch(/\bfetch\(|https?\.request|\.insert\(|\.delete\(|\.upsert\(|@\/lib\/actions|@\/lib\/supabase|from ["'](?:@anthropic|axios)/);
    }
  });
});
