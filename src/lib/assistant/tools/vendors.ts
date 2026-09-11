import { z } from "zod";
import { calculateRecommendation, type MatchDimension } from "@/lib/domain/recommendation";
import { lifecycleFromStoredStatus } from "@/lib/domain/couple-vendors";
import * as c from "./contracts";
import { allRows, coupleEvidence, defineReadTool, marketplaceEvidence, rows, ToolReadError, type ToolContext } from "./server";
import { readBudget, readWedding } from "./planning";

const vendorRow = z.object({
  id: c.id, business_name: c.vendorFacts.shape.businessName,
  category_slug: c.slug.nullable(), category_name: z.string().nullable(), subcategory_slug: c.slug.nullable(), subcategory_name: z.string().nullable(),
  location_city: c.vendorFacts.shape.locationCity, location_mode: c.locationMode, physical_area: c.area.nullable(), service_areas: c.vendorFacts.shape.serviceAreas,
  min_price_minor: c.dbMoney.nullable(), max_price_minor: c.dbMoney.nullable(), services: c.vendorFacts.shape.services,
  styles: c.vendorFacts.shape.styles, event_types: c.vendorFacts.shape.eventTypes, min_guest_capacity: c.vendorFacts.shape.minGuestCapacity,
  max_guest_capacity: c.vendorFacts.shape.maxGuestCapacity, friday_available: z.boolean().nullable(),
});
function vendorColumns() {
  return "id, business_name, category_slug, category_name, subcategory_slug, subcategory_name, location_city, location_mode, physical_area, service_areas, min_price_minor, max_price_minor, services, styles, event_types, min_guest_capacity, max_guest_capacity, friday_available";
}
const rating = z.number().min(1).max(5);
const ratingRow = z.object({ vendor_id: c.id, professionalism: rating, punctuality: rating, service_attitude: rating, value_for_money: rating });
async function publicRatings(context: ToolContext, vendorIds: string[]) {
  if (!vendorIds.length) return new Map<string, { ratingAverage: number; reviewCount: number }>();
  // Numerical dimensions only. No reviewer identity, text, dates, or individual reviews leave the tool.
  const reviews = await allRows((from, to) => context.db.from("public_vendor_reviews")
    .select("vendor_id, professionalism, punctuality, service_attitude, value_for_money")
    .in("vendor_id", vendorIds).order("id").range(from, to), ratingRow, c.LIMITS.reviewRows);
  const totals = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const previous = totals.get(review.vendor_id) ?? { sum: 0, count: 0 };
    previous.sum += (review.professionalism + review.punctuality + review.service_attitude + review.value_for_money) / 4;
    previous.count++;
    totals.set(review.vendor_id, previous);
  }
  return new Map([...totals].map(([vendorId, total]) => [vendorId, { ratingAverage: total.sum / total.count, reviewCount: total.count }]));
}
async function vendorValues(context: ToolContext, found: z.output<typeof vendorRow>[]) {
  const ratings = await publicRatings(context, found.map((vendor) => vendor.id));
  return found.map((row) => c.vendorFacts.parse({
    id: row.id, businessName: row.business_name,
    category: row.category_slug && row.category_name ? { slug: row.category_slug, name: row.category_name } : null,
    subcategory: row.subcategory_slug && row.subcategory_name ? { slug: row.subcategory_slug, name: row.subcategory_name } : null,
    locationCity: row.location_city, locationMode: row.location_mode, physicalArea: row.physical_area, serviceAreas: row.service_areas, minPriceMinor: row.min_price_minor, maxPriceMinor: row.max_price_minor,
    services: row.services, styles: row.styles, eventTypes: row.event_types, minGuestCapacity: row.min_guest_capacity,
    maxGuestCapacity: row.max_guest_capacity, fridayAvailable: row.friday_available,
    ratingAverage: ratings.get(row.id)?.ratingAverage ?? null, reviewCount: ratings.get(row.id)?.reviewCount ?? 0,
  }));
}
async function vendorsByIds(context: ToolContext, ids: string[]) {
  if (!ids.length) return [];
  return vendorValues(context, await rows(context.db.from("public_vendor_profiles").select(vendorColumns()).in("id", ids).order("id").limit(ids.length), vendorRow, ids.length));
}
function escapedPattern(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("%", "\\%").replaceAll("_", "\\_");
}
export const searchMarketplaceVendors = defineReadTool("search_marketplace_vendors", "Search a small page of the current public Ever After Marketplace. These are listing facts, not market benchmarks.", c.marketplaceInput, c.marketplaceData, async (input, context) => {
  const candidateQuery = () => {
    let query = context.db.from("public_vendor_profiles").select(vendorColumns());
    if (input.search) {
      const pattern = `"%${escapedPattern(input.search)}%"`;
      query = query.or(`business_name.ilike.${pattern},location_city.ilike.${pattern}`);
    }
    if (input.category) query = query.eq("category_slug", input.category);
    if (input.subcategory) query = query.eq("subcategory_slug", input.subcategory);
    if (input.city) query = query.ilike("location_city", escapedPattern(input.city));
    if (input.area) query = query.or(`and(location_mode.eq.fixed,physical_area.eq.${input.area}),and(location_mode.eq.mobile,service_areas.ov.{${input.area},flexible})`);
    if (input.minPriceMinor != null) query = query.gte("max_price_minor", input.minPriceMinor);
    if (input.maxPriceMinor != null) query = query.lte("min_price_minor", input.maxPriceMinor);
    if (input.style) query = query.contains("styles", [input.style]);
    if (input.eventType) query = query.contains("event_types", [input.eventType]);
    if (input.guestCount != null) query = query.lte("min_guest_capacity", input.guestCount).gte("max_guest_capacity", input.guestCount);
    if (input.fridayAvailable != null) query = query.eq("friday_available", input.fridayAvailable);
    return query.order("business_name").order("id");
  };
  const from = (input.page - 1) * input.limit;
  const result = (vendors: z.output<typeof c.vendorFacts>[], hasMore: boolean) => ({
    data: { vendors, pagination: { page: input.page, limit: input.limit, hasMore }, paginationBasis: "filtered_results" as const, marketScope: "ever_after_marketplace_only" as const },
    empty: !vendors.length, evidence: [marketplaceEvidence(vendors.map((vendor) => vendor.id))],
  });
  if (input.minRating == null) {
    const found = await rows(candidateQuery().range(from, from + input.limit), vendorRow, input.limit + 1);
    return result(await vendorValues(context, found.slice(0, input.limit)), found.length > input.limit);
  }

  // Scan in the same stable order on each invocation, applying ALL database
  // filters before rating. Keep only this filtered page and one matching lookahead.
  const page: z.output<typeof c.vendorFacts>[] = [];
  let matchingCount = 0;
  for (let offset = 0; offset < c.MARKETPLACE_SCAN.maxCandidates; offset += c.MARKETPLACE_SCAN.chunk) {
    const size = Math.min(c.MARKETPLACE_SCAN.chunk, c.MARKETPLACE_SCAN.maxCandidates - offset);
    // The extra raw sentinel proves exhaustion, even exactly at the scan cap.
    // It is not rated or returned; if needed it begins the next chunk.
    const found = await rows(candidateQuery().range(offset, offset + size), vendorRow, size + 1);
    const candidates = await vendorValues(context, found.slice(0, size));
    for (const vendor of candidates) {
      if (vendor.ratingAverage == null || vendor.ratingAverage < input.minRating) continue;
      if (matchingCount++ < from) continue;
      page.push(vendor);
      if (page.length > input.limit) return result(page.slice(0, input.limit), true);
    }
    if (found.length <= size) return result(page, false);
  }
  // A partial page (even a full page without proven lookahead) is not an answer.
  throw new ToolReadError("READ_LIMIT_EXCEEDED");
});

const relationshipRow = z.object({
  id: c.id, vendor_id: c.id.nullable(), external_vendor_id: c.id.nullable(), status: z.enum(["saved", "contacted", "considering", "booked", "rejected"]),
  is_saved: z.boolean(), agreed_price_minor: c.dbMoney.nullable(), external_vendors: z.object({ vendor_categories: z.object({ slug: c.slug }).nullable() }).nullable(),
});
const externalRow = z.object({ id: c.id, business_name: c.externalFacts.shape.businessName, vendor_categories: c.taxonomy, vendor_subcategories: c.taxonomy });
export const getCoupleVendors = defineReadTool("get_couple_vendors", "Read bounded Couple vendor relationships and allowed Marketplace/external-vendor facts, without contacts or notes.", c.coupleVendorsInput, c.coupleVendorData, async (input, context) => {
  const found = await allRows((from, to) => {
    let query = context.db.from("couple_vendors")
      .select("id, vendor_id, external_vendor_id, status, is_saved, agreed_price_minor, external_vendors(vendor_categories(slug))")
      .eq("wedding_id", context.weddingId);
    if (input.saved != null) query = query.eq("is_saved", input.saved);
    if (input.lifecycle) query = query.eq("status", input.lifecycle);
    if (input.source === "marketplace") query = query.not("vendor_id", "is", null);
    if (input.source === "external") query = query.not("external_vendor_id", "is", null);
    return query.order("id").range(from, to);
  }, relationshipRow, c.LIMITS.relationshipRows);
  for (const row of found) {
    if ((!row.vendor_id && !row.external_vendor_id) || (row.vendor_id && row.external_vendor_id) || (row.external_vendor_id && !row.external_vendors)) throw new ToolReadError("INVALID_SOURCE_DATA");
  }
  const allMarketplaceIds = found.flatMap((row) => row.vendor_id ? [row.vendor_id] : []);
  const allPublicVendors = await vendorsByIds(context, allMarketplaceIds);
  const publicVendorById = new Map(allPublicVendors.map((vendor) => [vendor.id, vendor]));
  // A category can belong to either relation; filter this bounded identity set
  // before pagination instead of unsafe cross-embed OR expressions.
  const filtered = input.category ? found.filter((row) => (
    row.vendor_id ? publicVendorById.get(row.vendor_id)?.category?.slug : row.external_vendors?.vendor_categories?.slug
  ) === input.category) : found;
  const from = (input.page - 1) * input.limit;
  const selected = filtered.slice(from, from + input.limit);
  const marketplaceIds = selected.flatMap((row) => row.vendor_id ? [row.vendor_id] : []);
  const externalIds = selected.flatMap((row) => row.external_vendor_id ? [row.external_vendor_id] : []);
  const externalVendors = externalIds.length
    ? await rows(context.db.from("external_vendors").select("id, business_name, vendor_categories(slug, name), vendor_subcategories(slug, name)").eq("wedding_id", context.weddingId).in("id", externalIds).order("id").limit(externalIds.length), externalRow, externalIds.length)
    : [];
  const publicVendors = marketplaceIds.flatMap((id) => {
    const vendor = publicVendorById.get(id);
    return vendor ? [vendor] : [];
  });
  const vendors = selected.map((row) => {
    const marketplace = publicVendors.find((vendor) => vendor.id === row.vendor_id);
    const external = externalVendors.find((vendor) => vendor.id === row.external_vendor_id);
    if (!marketplace && !external) throw new ToolReadError();
    return c.coupleVendor.parse({ relationshipId: row.id, saved: row.is_saved, lifecycle: lifecycleFromStoredStatus(row.status), agreedPriceMinor: row.agreed_price_minor,
      vendor: marketplace ? { ...marketplace, source: "marketplace" } : { id: external!.id, businessName: external!.business_name, category: external!.vendor_categories, subcategory: external!.vendor_subcategories, source: "external" } });
  });
  return { data: { vendors, pagination: { page: input.page, limit: input.limit, hasMore: filtered.length > from + input.limit } }, empty: !vendors.length,
    evidence: [coupleEvidence("vendors"), ...(marketplaceIds.length ? [marketplaceEvidence(marketplaceIds)] : [])] };
});

export const compareVendors = defineReadTool("compare_vendors", "Compare 2–4 public Marketplace vendors using owned wedding context and the existing deterministic scoring engine.", c.compareInput, c.comparisonData, async (input, context) => {
  const [wedding, budget, found] = await Promise.all([readWedding(context), readBudget(context), vendorsByIds(context, input.vendorIds)]);
  const matchContext = { preferredArea: wedding.preferredArea, availableBudgetMinor: budget.data.availableMinor, styles: wedding.styles, guestCount: wedding.guestCount, eventType: wedding.eventType };
  const dimensions: MatchDimension[] = ["area", "budget", "style", "capacity", "eventType", "rating"];
  const vendors = input.vendorIds.flatMap((vendorId) => {
    const vendor = found.find((item) => item.id === vendorId);
    if (!vendor) return [];
    const calculated = calculateRecommendation(matchContext, {
      ...vendor,
      pricePerGuest: vendor.category?.slug === "venues",
    });
    // Use the engine's existing two-substantive-dimension evidence threshold.
    // Withhold a misleading personalized score rather than turning rating alone into fit.
    const fair = calculated.applicableDimensions.filter((dimension) => dimension !== "rating").length >= 2;
    return [{ vendor, recommendation: { ...calculated, score: fair ? calculated.score : null, isRecommended: fair && calculated.isRecommended },
      scoreStatus: fair ? "calculated" as const : "insufficient_evidence" as const, missingEvidence: dimensions.filter((dimension) => !calculated.applicableDimensions.includes(dimension)) }];
  });
  return { data: { vendors, missingVendorIds: input.vendorIds.filter((vendorId) => !found.some((vendor) => vendor.id === vendorId)), matchContext, marketScope: "ever_after_marketplace_only" as const },
    empty: !vendors.length, evidence: [marketplaceEvidence(found.map((vendor) => vendor.id)), coupleEvidence("wedding"), coupleEvidence("budget")] };
});
