import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";
import vendors from "@/generated/marketplace-demo.json";

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

const expectedImagePoolCounts: Record<string, number> = {
  "wedding-venues": 36,
  "wedding-photographers": 12,
  videographers: 22,
  "magnet-photographers": 22,
  "social-content": 10,
  djs: 12,
  attractions: 7,
  "photo-booths": 8,
  "wedding-dresses": 12,
  suits: 9,
  "makeup-hair": 12,
  "event-design": 8,
  flowers: 10,
  invitations: 12,
  "guest-gifts": 7,
  transportation: 5,
  officiants: 5,
  "event-managers": 6,
  "preparation-hotels": 12,
};

const allowedStyles = new Set([
  "Vintage", "Rustic / Countryside", "Israeli", "Urban", "Elegant", "Classic",
  "Romantic", "Modern", "Luxury", "Nature", "Intimate", "Minimalist", "Party / Festival",
]);

const genericBusinessWords = new Set([
  "acts", "and", "atelier", "bar", "beats", "beauty", "behind", "bespoke", "booth", "botanical", "bridal", "by", "celebration", "ceremonies", "ceremony",
  "chuppah", "cinema", "co", "content", "coordination", "corner", "couture", "dancefloor", "design", "dress", "dresses", "editorial", "event",
  "entertainment", "experiences", "favor", "favors", "film", "films", "floral", "florals", "flower", "flowers", "formalwear", "gift", "gifts", "goods", "guidance",
  "guest", "guests", "hair", "hotel", "house", "images", "instant", "invitation", "journal", "keepsakes", "lab", "live", "magnet", "magnets",
  "makeup", "management", "memory", "menswear", "moments", "motion", "music", "officiant", "paper", "photo", "photography", "pictures", "planning",
  "party", "performers", "portrait", "portraits", "preparation", "print", "prints", "producers", "reception", "reel", "reels", "retreat", "rides", "room", "rooms", "routes", "salon",
  "scenes", "services", "shuttle", "shuttles", "social", "sound", "stationery", "stay", "stories", "story", "studio", "suit", "suites", "suits",
  "styling", "tailor", "tailoring", "the", "transit", "transport", "tuxedo", "visual", "vow", "wedding", "welcome", "works",
]);

describe("generated marketplace dataset", () => {
  it("preserves the reviewed venue corrections without renaming stable slugs", () => {
    const find = (slug: string) => vendors.find((vendor) => vendor.slug === slug)!;
    expect(find("luna-estate-atelier-03").locationCity).toBe("Jaffa, Tel Aviv");
    expect(find("olive-estate-house-05")).toMatchObject({ locationCity: "Kibbutz Ga'ash", serviceAreas: ["sharon"], minPriceMinor: 34000, maxPriceMinor: 44000 });
    expect(find("arava-estate-works-08")).toMatchObject({ minPriceMinor: 35000, maxPriceMinor: 45000 });
    expect(find("lark-estate-and-co-09")).toMatchObject({ locationCity: "Caesarea", minPriceMinor: 38000, maxPriceMinor: 48000 });
    expect(find("velvet-estate-atelier-11").businessName).toBe("Citrus");
    for (const slug of ["luna-estate-atelier-03", "olive-estate-house-05", "lark-estate-and-co-09"]) {
      expect(find(slug).description).toContain(find(slug).locationCity);
    }
    expect(find("velvet-estate-atelier-11").description).toContain("Citrus");
  });

  it("has deterministic unique identities and the required taxonomy counts", () => {
    expect(vendors).toHaveLength(432);
    expect(new Set(vendors.map((vendor) => vendor.id)).size).toBe(432);
    expect(new Set(vendors.map((vendor) => vendor.slug)).size).toBe(432);
    expect(new Set(vendors.map((vendor) => vendor.businessName)).size).toBe(432);
    expect(new Set(vendors.map((vendor) => vendor.description)).size).toBe(432);
    for (const [slug, expected] of Object.entries(expectedSubcategories)) {
      const matches = vendors.filter((vendor) => vendor.subcategorySlug === slug);
      expect(matches).toHaveLength(expected.count);
      expect(matches.every((vendor) => vendor.categorySlug === expected.category)).toBe(true);
      expect(new Set(matches.map((vendor) => vendor.services.toSorted().join("|"))).size).toBeGreaterThanOrEqual(10);
      expect(new Set(matches.map((vendor) => `${vendor.minPriceMinor}-${vendor.maxPriceMinor}`)).size).toBeGreaterThanOrEqual(10);
    }
  });

  it("uses a distinct brand vocabulary instead of recycling generator stems", () => {
    const meaningfulWordFrequency = new Map<string, number>();
    for (const vendor of vendors) {
      const words = new Set(vendor.businessName.toLowerCase().match(/[a-z]+/g) ?? []);
      for (const word of words) {
        if (word.length <= 2 || genericBusinessWords.has(word)) continue;
        meaningfulWordFrequency.set(word, (meaningfulWordFrequency.get(word) ?? 0) + 1);
      }
    }
    const unusuallyRepeated = [...meaningfulWordFrequency].filter(([, count]) => count > 2);
    expect(unusuallyRepeated).toEqual([]);
    expect([...meaningfulWordFrequency].filter(([, count]) => count === 2).map(([word]) => word).sort()).toEqual(["courtyard", "mitzpe", "rimon"]);
  });

  it("derives the requested venue ratings from real demo review scores", () => {
    for (const [slug, rating] of Object.entries({
      "wild-estate-studio-15": "4.0", "north-estate-collective-20": "4.5",
      "south-estate-house-21": "4.2", "lark-estate-and-co-09": "4.0",
      "mosaic-estate-collective-12": "3.9", "pomegranate-estate-workshop-10": "4.0",
    })) {
      expect(vendors.find((vendor) => vendor.slug === slug)?.ratingAverage?.toFixed(1), slug).toBe(rating);
    }
    const south = vendors.find((vendor) => vendor.slug === "south-estate-house-21")!;
    expect(south.reviews).toHaveLength(3);
    expect(south.reviews.slice(1).map((review) => review.id)).toEqual([
      "50000000-0000-4000-8000-000000300210", "50000000-0000-4000-8000-000000300211",
    ]);
    for (const [slug, city] of Object.entries({
      "juniper-estate-studio-23": "Ein Hemed", "linen-estate-works-24": "Shoresh",
      "orchid-estate-and-co-25": "Masada", "honey-estate-project-30": "Rishon LeZion",
      "indigo-estate-atelier-35": "Hadera", "willow-estate-collective-36": "Kibbutz Hulda",
    })) {
      const vendor = vendors.find((entry) => entry.slug === slug)!;
      expect(vendor.locationCity).toBe(city);
      expect(vendor.description).toContain(city);
    }
    expect(vendors.find((vendor) => vendor.slug === "orchid-estate-and-co-25")).toMatchObject({ minPriceMinor: 55000, maxPriceMinor: 70000 });
    expect(south).toMatchObject({ minPriceMinor: 38000, maxPriceMinor: 48000 });
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
    expect(reviews).toHaveLength(2383);
    expect(new Set(reviews.map((review) => review.id)).size).toBe(reviews.length);
    expect(new Set(reviews.map((review) => review.reviewText)).size).toBeGreaterThan(250);
    expect(vendors.filter((vendor) => vendor.reviewCount === 0).length).toBeGreaterThan(0);
    expect(vendors.filter((vendor) => vendor.reviewCount >= 1 && vendor.reviewCount <= 2).length).toBeGreaterThan(0);
    expect(vendors.filter((vendor) => vendor.reviewCount >= 3 && vendor.reviewCount <= 7).length).toBeGreaterThan(200);
    expect(vendors.filter((vendor) => vendor.reviewCount >= 8 && vendor.reviewCount <= 12).length).toBeGreaterThan(0);
    expect(vendors.filter((vendor) => vendor.reviewCount >= 13).length).toBeGreaterThan(0);
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

  it("references the complete local WebP pool for every vendor and no external image host", () => {
    const uniqueImageUrls = new Set(vendors.map((vendor) => vendor.imageUrl));
    expect(uniqueImageUrls.size).toBe(227);
    expect([...uniqueImageUrls].filter((url) => url.includes("?v="))).toHaveLength(13);

    for (const vendor of vendors) {
      expect(vendor.imageUrl).toMatch(/^\/demo-marketplace\/[a-z0-9-]+\/[a-z0-9-]+-\d{2}\.webp(?:\?v=[a-f0-9]{12})?$/);
      const url = new URL(vendor.imageUrl, "http://localhost");
      const imagePath = path.join(process.cwd(), "public", url.pathname.replace(/^\//, ""));
      expect(existsSync(imagePath)).toBe(true);
      const data = readFileSync(imagePath);
      expect(data.subarray(0, 4).toString("ascii"), vendor.imageUrl).toBe("RIFF");
      expect(data.subarray(8, 12).toString("ascii"), vendor.imageUrl).toBe("WEBP");
      if (url.searchParams.has("v")) {
        expect(url.searchParams.get("v")).toBe(createHash("sha256").update(data).digest("hex").slice(0, 12));
      }
    }

    for (const [subcategory, expectedCount] of Object.entries(expectedImagePoolCounts)) {
      const urls = new Set(
        vendors.filter((vendor) => vendor.subcategorySlug === subcategory).map((vendor) => vendor.imageUrl),
      );
      const priority = ["wedding-photographers", "videographers", "magnet-photographers"].includes(subcategory);
      const supplemented = ["social-content", "photo-booths", "event-design", "flowers"].includes(subcategory);
      expect(urls.size, subcategory).toBe(priority ? 22 : supplemented ? 12 : expectedCount);
      const files = readdirSync(path.join(process.cwd(), "public", "demo-marketplace", subcategory)).filter((name) => name.endsWith(".webp"));
      expect(files, subcategory).toHaveLength(expectedCount);
      const hashes = [...urls].map((url) => createHash("sha256").update(readFileSync(path.join(process.cwd(), "public", url.split("?")[0]))).digest("hex"));
      expect(new Set(hashes).size, subcategory).toBe(urls.size);
    }
  });

  it("spreads targeted cover reuse beyond ordinary twelve-card category pages", () => {
    const targeted = new Set(["social-content", "djs", "photo-booths", "wedding-dresses", "makeup-hair", "event-design", "flowers", "invitations", "preparation-hotels"]);
    const listings = [vendors, ...Object.keys(expectedSubcategories).map(slug => vendors.filter(v => v.subcategorySlug === slug)), ...[...new Set(vendors.map(v => v.categorySlug))].map(slug => vendors.filter(v => v.categorySlug === slug))];
    for (const listing of listings) {
      for (let start = 0; start < listing.length; start += 12) {
        const page = listing.slice(start, start + 12);
        for (const subcategory of targeted) {
          const covers = page.filter(v => v.subcategorySlug === subcategory).map(v => v.imageUrl);
          expect(new Set(covers).size, `${subcategory}, page ${start / 12 + 1}`).toBe(covers.length);
        }
      }
    }
    for (const vendor of vendors.filter(v => v.imageUrl.endsWith("makeup-hair-11.webp"))) {
      expect(vendor.services).toContain("Groom grooming");
    }
  });

  it("keeps diverse venue names and applies only the requested portfolio feedback", () => {
    const venues = vendors.filter((vendor) => vendor.subcategorySlug === "wedding-venues");
    expect(venues.filter((vendor) => /\bEstate\b/i.test(vendor.businessName))).toHaveLength(0);
    expect(venues.every((vendor) => vendor.slug.includes("-estate-"))).toBe(true);
    for (const [slug, rating] of Object.entries({
      "dawn-photography-collective-01": "4.0", "lark-photography-studio-04": "4.8",
      "pomegranate-photography-works-05": "4.1", "mosaic-films-works-02": "4.6",
      "golden-films-and-co-03": "4.5",
    })) expect(vendors.find((vendor) => vendor.slug === slug)?.ratingAverage?.toFixed(1)).toBe(rating);
    expect(vendors.find((vendor) => vendor.slug === "pomegranate-photography-works-05")).toMatchObject({ minPriceMinor: 1250000, maxPriceMinor: 1650000 });
    expect(vendors.find((vendor) => vendor.slug === "lark-photography-studio-04")?.locationCity).toBe("Tel Aviv");
    expect(vendors.find((vendor) => vendor.slug === "sol-estate-and-co-33")?.locationCity).toBe("Tel Aviv");
    expect(vendors.find((vendor) => vendor.slug === "mosaic-films-works-02")?.locationCity).toBe("Ramat Gan");
    expect(vendors.find((vendor) => vendor.slug === "golden-photography-atelier-08")?.imageUrl).toContain("wedding-photographers-08.webp");
  });

  it("applies only the requested North, Terra and Golden photography corrections", () => {
    const north = vendors.find((vendor) => vendor.slug === "north-photography-workshop-15")!;
    expect(north).toMatchObject({ id: "30000000-0000-4000-8000-000000001051", locationCity: "Central District", serviceAreas: ["central_israel", "north"], reviewCount: 1, ratingAverage: 4.75, minPriceMinor: 1132000, maxPriceMinor: 1500000 });
    expect(north.reviews[0].id).toBe("50000000-0000-4000-8000-000000300510");
    const terra = vendors.find((vendor) => vendor.slug === "terra-photography-and-co-14")!;
    expect(terra).toMatchObject({ ratingAverage: 4, reviewCount: 8, minPriceMinor: 864000, maxPriceMinor: 1179000 });
    const golden = vendors.find((vendor) => vendor.slug === "golden-photography-atelier-08")!;
    expect(golden).toMatchObject({ ratingAverage: 3.875, reviewCount: 2, minPriceMinor: 800000, maxPriceMinor: 1100000 });
    expect(golden.ratingAverage?.toFixed(1)).toBe("3.9");
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
