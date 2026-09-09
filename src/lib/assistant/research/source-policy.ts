import "next/headers";
import { futureResearchContracts, type researchSourceSchema } from "./contracts";
import type { z } from "zod";
import type { NormalizedResearchRequest } from "./policy";

type Source = z.infer<typeof researchSourceSchema>;
export type SourcePolicy = Readonly<Record<string, { publisher: string; type: Source["sourceType"] }>>;
// Reviewed additional first-party domains can be added here after source review.
// Provider-supplied labels never grant authority or publisher independence.
export const SOURCE_POLICY: SourcePolicy = Object.freeze({});
export function classifySource(url: string, policy: SourcePolicy = SOURCE_POLICY) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(parsed.hostname)) throw new Error("Unsafe source.");
  if (parsed.hostname === "gov.il" || parsed.hostname.endsWith(".gov.il")) return { publisher: "Israeli government", type: "official" as const };
  return policy[parsed.hostname] ?? { publisher: parsed.hostname, type: "commercial_article" as const };
}

export function reviewResearchResult(request: NormalizedResearchRequest, raw: unknown, citations: readonly string[], now: Date, policy = SOURCE_POLICY) {
  const result = futureResearchContracts[request.tool].outputSchema.parse(raw);
  if (result.status === "unavailable") return result;
  const verified = new Set(citations);
  const sources = result.sources.map(source => {
    if (!verified.has(source.url)) throw new Error("Unverified citation.");
    if ([source.publishedAt, source.updatedAt].some(date => date && Date.parse(date) > now.getTime())) throw new Error("Unverified future date.");
    const classification = classifySource(source.url, policy);
    return { ...source, retrievedAt: now.toISOString(), sourceType: classification.type, publisher: classification.publisher };
  });
  if (result.status === "insufficient_evidence") return { ...result, sources, researchedAt: now.toISOString() };
  const insufficient = (reason: "STALE_SOURCES" | "NO_RELEVANT_SOURCES" | "INCOMPARABLE_PACKAGES") => ({
    status: "insufficient_evidence" as const, reason, sources, researchedAt: now.toISOString(),
    limitations: ["Current, independent and comparable evidence could not be established. Verify the relevant first-party source."],
  });
  const attributes = request.attributes;
  for (const key of request.tool === "get_market_benchmark" ? ["purpose", "category", "countryCode", "region"] : ["topic", "countryCode", "region"]) {
    if (JSON.stringify(Reflect.get(attributes, key)) !== JSON.stringify(Reflect.get(result.data, key))) throw new Error("Research context mismatch.");
  }
  const procedural = request.tool === "research_current_wedding_info" && !["wedding_industry_norms", "wedding_logistics"].includes(request.attributes.topic);
  if (procedural && sources.some(source => source.sourceType !== "official")) return insufficient("NO_RELEVANT_SOURCES");
  // A retrieval timestamp is not a publication date. Unknown freshness stays partial.
  const dated = sources.filter(source => source.updatedAt || source.publishedAt);
  if (dated.some(source => now.getTime() - Date.parse(source.updatedAt ?? source.publishedAt!) > 180 * 86400000)) return insufficient("STALE_SOURCES");
  if (request.tool === "get_market_benchmark" && "observedRange" in result.data && result.data.observedRange) {
    const used = sources.filter(source => result.data && "observedRange" in result.data && result.data.observedRange?.sourceIds.includes(source.sourceId));
    const target = request.attributes;
    const currency = result.data.currency;
    if (currency !== (target.quotedPrice?.currency ?? "ILS")) return insufficient("INCOMPARABLE_PACKAGES");
    if (used.some(source => !source.benchmarkContext || ["category", "region", "coverageHours", "numberOfProfessionals", "videoIncluded"].some(key => Reflect.get(target, key) !== undefined && JSON.stringify(Reflect.get(target, key)) !== JSON.stringify(Reflect.get(source.benchmarkContext!, key)))
      || source.benchmarkContext.currency !== currency || target.packageFeatures.some(feature => !source.benchmarkContext?.packageFeatures.includes(feature)))
      || new Set(used.map(source => JSON.stringify(source.benchmarkContext))).size > 1) return insufficient("INCOMPARABLE_PACKAGES");
  }
  if ("typicalRange" in result.data && result.data.typicalRange) {
    const used = sources.filter(source => result.data && "typicalRange" in result.data && result.data.typicalRange?.sourceIds.includes(source.sourceId));
    if (new Set(used.map(source => source.publisher)).size < 2 || used.some(source => !["reported_market_guidance", "research_report"].includes(source.sourceType)) || !result.data.packageAssumptions.length) return insufficient("INCOMPARABLE_PACKAGES");
  }
  // Provider-extracted dates/package comparability have not been independently
  // reviewed. Do not promote them to a verified universal current fact.
  return { ...result, status: "partial" as const, sources, researchedAt: now.toISOString(), data: {
    ...result.data, limitations: [...result.data.limitations.slice(0, 10), "Source currentness and applicability require confirmation; retrieval alone does not verify current requirements or comparable packages."],
  } };
}
