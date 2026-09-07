import { z } from "zod";
import { area, eventType, weddingData } from "../tools/contracts";
import { benchmarkInputSchema, packageFeature, researchService } from "../research/contracts";
import { normalizeResearchRequest } from "../research/policy";
import { clarificationSchema } from "./policy";

// A future model extracts this structured proposal; Ever After validates it. No NLP extractor.
export const normalizedQuoteSchema = z.object({
  category: researchService.optional(), service: z.enum(["stills", "photo_video", "video", "dj", "venue_hire"]).optional(),
  quotedPrice: benchmarkInputSchema.shape.quotedPrice,
  coverageHours: z.number().min(0.5).max(24).optional(), numberOfProfessionals: z.number().int().min(1).max(50).optional(),
  inclusions: z.array(packageFeature).max(14).default([]), addOns: z.array(packageFeature).max(14).default([]),
  videoIncluded: z.boolean().optional(), region: area.optional(), eventType: eventType.optional(),
}).strict().superRefine((quote, ctx) => {
  if ((quote.service === "photo_video" || quote.inclusions.includes("video")) && quote.videoIncluded === false) ctx.addIssue({ code: "custom", message: "Conflicting video scope." });
  const serviceCategory = { stills: "photography", photo_video: "photography", video: "videography", dj: "music", venue_hire: "venue" } as const;
  if (quote.service && quote.category && serviceCategory[quote.service] !== quote.category) ctx.addIssue({ code: "custom", message: "Service and category conflict." });
});
export function prepareQuote(raw: unknown, rawWedding: unknown = null, now = new Date()) {
  const quote = normalizedQuoteSchema.parse(raw);
  const wedding = rawWedding == null ? null : weddingData.parse(rawWedding);
  const category = quote.category ?? (quote.service ? ({ stills: "photography", photo_video: "photography", video: "videography", dj: "music", venue_hire: "venue" } as const)[quote.service] : undefined);
  const region = quote.region ?? wedding?.preferredArea ?? undefined;
  const videoIncluded = quote.videoIncluded ?? (quote.service === "photo_video" || quote.inclusions.includes("video") ? true : undefined);
  const missingFields: z.output<typeof clarificationSchema>["missingFields"] = [];
  if (!category) missingFields.push({ field: "category", questionIntent: "identify_service", reason: "package_comparability" });
  if (!quote.quotedPrice) missingFields.push({ field: "quotedPrice", questionIntent: "specify_quote", reason: "package_comparability" });
  if (!region || region === "flexible") missingFields.push({ field: "region", questionIntent: "locate_event", reason: "regional_comparability" });
  if (category === "photography") {
    if (quote.coverageHours == null) missingFields.push({ field: "coverageHours", questionIntent: "define_package", reason: "package_comparability" });
    if (videoIncluded == null) missingFields.push({ field: "videoIncluded", questionIntent: "define_package", reason: "package_comparability" });
  }
  const clarification = clarificationSchema.parse({ required: missingFields.length > 0, missingFields });
  // All package quantities use controlled fields; no user prose or private notes are forwarded.
  const researchRequest = clarification.required ? null : normalizeResearchRequest("get_market_benchmark", {
    purpose: "service_quote", category, quotedPrice: quote.quotedPrice, region,
    packageFeatures: [...new Set([...quote.inclusions, ...(videoIncluded ? ["video" as const] : [])])],
    coverageHours: quote.coverageHours, numberOfProfessionals: quote.numberOfProfessionals, videoIncluded,
    ...(wedding?.guestCount ? { guestCount: wedding.guestCount } : {}), ...(wedding?.weddingDate ? { weddingDate: wedding.weddingDate } : {}),
    eventType: quote.eventType ?? wedding?.eventType ?? undefined,
  }, now);
  return { quote: { ...quote, category, videoIncluded }, clarification, researchRequest, researchLive: false as const,
    // Add-ons are not silently counted as included in the price.
    limitations: quote.addOns.length ? ["add_on_price_scope_unverified" as const] : [] };
}
