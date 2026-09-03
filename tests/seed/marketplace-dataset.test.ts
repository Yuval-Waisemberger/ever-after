import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import vendors from "@/generated/marketplace-demo.json";
import stats from "@/generated/marketplace-stats.json";

const expectedSubcategories: Record<string, { category: string; count: number }> = {
  "wedding-venues": { category: "venues", count: 36 },
  "wedding-photographers": { category: "photography-content", count: 22 },
  videographers: { category: "photography-content", count: 22 },
  "magnet-photographers": { category: "photography-content", count: 22 },
  "social-content": { category: "photography-content", count: 22 },
  djs: { category: "music-entertainment", count: 22 },
  attractions: { category: "music-entertainment", count: 22 },
  "photo-booths": { category: "music-entertainment", count: 22 },
  "wedding-dresses": { category: "beauty-attire", count: 22 },
  suits: { category: "beauty-attire", count: 22 },
  "makeup-hair": { category: "beauty-attire", count: 22 },
  "event-design": { category: "design-flowers", count: 22 },
  flowers: { category: "design-flowers", count: 22 },
  invitations: { category: "design-flowers", count: 22 },
  "guest-gifts": { category: "design-flowers", count: 22 },
  transportation: { category: "event-services", count: 22 },
  officiants: { category: "event-services", count: 22 },
  "event-managers": { category: "event-services", count: 22 },
  "preparation-hotels": { category: "event-services", count: 22 },
};

const allowedStyles = new Set([
  "Vintage", "Rustic / Countryside", "Israeli", "Urban", "Elegant", "Classic",
  "Romantic", "Modern", "Luxury", "Nature", "Intimate", "Minimalist", "Party / Festival",
]);

describe("generated marketplace dataset", () => {
  it("has deterministic unique identities and the required taxonomy counts", () => {
    expect(vendors).toHaveLength(432);
    expect(stats.totalVendors).toBe(432);
    expect(new Set(vendors.map((vendor) => vendor.id)).size).toBe(432);
    expect(new Set(vendors.map((vendor) => vendor.slug)).size).toBe(432);
    expect(new Set(vendors.map((vendor) => vendor.businessName)).size).toBe(432);
    expect(new Set(vendors.map((vendor) => vendor.description)).size).toBe(432);
    expect(stats.subcategoryCounts).toEqual(Object.fromEntries(Object.entries(expectedSubcategories).map(([slug, value]) => [slug, value.count])));
    for (const [slug, expected] of Object.entries(expectedSubcategories)) {
      const matches = vendors.filter((vendor) => vendor.subcategorySlug === slug);
      expect(matches).toHaveLength(expected.count);
      expect(matches.every((vendor) => vendor.categorySlug === expected.category)).toBe(true);
      expect(new Set(matches.map((vendor) => vendor.services.toSorted().join("|"))).size).toBeGreaterThanOrEqual(10);
      expect(new Set(matches.map((vendor) => `${vendor.minPriceMinor}-${vendor.maxPriceMinor}`)).size).toBeGreaterThanOrEqual(10);
    }
  });

  it("keeps prices, capacities, enums, and category-specific attributes valid", () => {
    for (const vendor of vendors) {
      expect(vendor.minPriceMinor).toBeGreaterThanOrEqual(0);
      expect(vendor.maxPriceMinor).toBeGreaterThanOrEqual(vendor.minPriceMinor);
      expect(vendor.services.length).toBeGreaterThanOrEqual(4);
      expect(vendor.styles.length).toBeGreaterThanOrEqual(2);
      expect(vendor.styles.every((style) => allowedStyles.has(style))).toBe(true);
      expect(vendor.serviceAreas.every((area) => ["central_israel", "sharon", "north", "jerusalem", "south", "flexible"].includes(area))).toBe(true);
      if (vendor.minGuestCapacity != null) {
        expect(vendor.maxGuestCapacity).toBeGreaterThanOrEqual(vendor.minGuestCapacity);
      }
    }
    const venues = vendors.filter((vendor) => vendor.subcategorySlug === "wedding-venues");
    expect(venues.every((vendor) => vendor.locationCity && vendor.minGuestCapacity && vendor.maxGuestCapacity)).toBe(true);
    expect(new Set(venues.map((vendor) => vendor.locationCity)).size).toBeGreaterThanOrEqual(20);
    expect(new Set(venues.flatMap((vendor) => vendor.services)).size).toBeGreaterThanOrEqual(10);
  });

  it("has varied, internally consistent fictional reviews", () => {
    const reviews = vendors.flatMap((vendor) => vendor.reviews);
    expect(reviews).toHaveLength(stats.totalReviews);
    expect(new Set(reviews.map((review) => review.id)).size).toBe(reviews.length);
    expect(new Set(reviews.map((review) => review.reviewText)).size).toBeGreaterThan(250);
    expect(stats.reviewDistribution.none).toBeGreaterThan(0);
    expect(stats.reviewDistribution.few_1_2).toBeGreaterThan(0);
    expect(stats.reviewDistribution.several_3_7).toBeGreaterThan(200);
    expect(stats.reviewDistribution.established_8_12).toBeGreaterThan(0);
    expect(stats.reviewDistribution.high_13_plus).toBeGreaterThan(0);
    for (const vendor of vendors) {
      const calculated = vendor.reviews.length
        ? vendor.reviews.reduce((sum, review) => sum + (review.professionalism + review.punctuality + review.serviceAttitude + review.valueForMoney) / 4, 0) / vendor.reviews.length
        : null;
      expect(vendor.reviewCount).toBe(vendor.reviews.length);
      expect(vendor.ratingAverage).toBe(calculated);
      expect(vendor.gallery).toHaveLength(1);
      expect(vendor.gallery[0]?.url).toBe(vendor.imageUrl);
      for (const review of vendor.reviews) {
        expect(review.vendorId).toBe(vendor.id);
        const average = (review.professionalism + review.punctuality + review.serviceAttitude + review.valueForMoney) / 4;
        expect([review.professionalism, review.punctuality, review.serviceAttitude, review.valueForMoney].every((score) => score >= 1 && score <= 5)).toBe(true);
        expect(review.wouldChooseAgain).toBe(average >= 3.75);
      }
    }
  });

  it("references a checked-in local SVG for every vendor and no external image host", () => {
    for (const vendor of vendors) {
      expect(vendor.imageUrl).toMatch(/^\/demo-vendors\/[a-z0-9-]+\.svg$/);
      expect(existsSync(path.join(process.cwd(), "public", vendor.imageUrl))).toBe(true);
    }
  });

  it("emits an idempotent transaction compatible with the location migration", () => {
    const sql = readFileSync(path.join(process.cwd(), "supabase", "seed.sql"), "utf8");
    expect(sql).toMatch(/^-- GENERATED FILE/);
    expect(sql).toContain("begin;");
    expect(sql).toContain("location_city");
    expect(sql.match(/on conflict/g)?.length).toBe(5);
    expect(sql.trimEnd()).toMatch(/commit;$/);
    expect(sql).not.toContain("unsplash.com");
  });
});
