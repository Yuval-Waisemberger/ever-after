import { describe, expect, it } from "vitest";
import { calculateRecommendation } from "@/lib/domain/recommendation";

describe("calculateRecommendation", () => {
  it("recommends a vendor using multiple matching dimensions", () => {
    const result = calculateRecommendation(
      {
        preferredArea: "Central Israel",
        availableBudgetMinor: 1_500_000,
        styles: ["Vintage", "Romantic"],
        guestCount: 250,
        eventType: "Friday afternoon",
      },
      {
        serviceAreas: ["Central Israel"],
        minPriceMinor: 900_000,
        maxPriceMinor: 1_200_000,
        styles: ["Romantic"],
        minGuestCapacity: 100,
        maxGuestCapacity: 350,
        eventTypes: ["Friday afternoon"],
        ratingAverage: 4.8,
      },
    );

    expect(result.score).toBe(100);
    expect(result.isRecommended).toBe(true);
    expect(result.reasons[0]?.earnedWeight).toBe(25);
  });

  it("does not show a recommendation from rating alone", () => {
    const result = calculateRecommendation({}, { ratingAverage: 5 });
    expect(result.score).toBe(100);
    expect(result.isRecommended).toBe(false);
  });

  it("ignores missing wedding fields instead of treating them as mismatches", () => {
    const result = calculateRecommendation(
      { preferredArea: "Flexible", styles: ["Modern"] },
      { serviceAreas: ["North"], styles: ["Modern"], ratingAverage: 3 },
    );
    expect(result.applicableDimensions).toEqual(["area", "style", "rating"]);
    expect(result.score).toBe(82);
    expect(result.isRecommended).toBe(true);
  });

  it("treats a nationwide flexible vendor as serving a specific region", () => {
    const result = calculateRecommendation(
      { preferredArea: "south", styles: ["Nature"] },
      { serviceAreas: ["flexible"], styles: ["Nature"] },
    );
    expect(result.score).toBe(100);
    expect(result.isRecommended).toBe(true);
  });

  it("matches a fixed Vendor through physical area and uses accurate wording", () => {
    const result = calculateRecommendation(
      { preferredArea: "central_israel", styles: ["Romantic"] },
      { locationMode: "fixed", physicalArea: "central_israel", serviceAreas: ["south"], styles: ["Romantic"] },
    );
    expect(result.score).toBe(100);
    expect(result.reasons[0]?.label).toBe("Located in Central Israel");
  });

  it("matches a mobile Vendor only through service coverage", () => {
    const result = calculateRecommendation(
      { preferredArea: "jerusalem", styles: ["Romantic"] },
      { locationMode: "mobile", physicalArea: "south", serviceAreas: ["jerusalem"], styles: ["Romantic"] },
    );
    expect(result.score).toBe(100);
    expect(result.reasons[0]?.label).toBe("Serves Jerusalem Area");
  });

  it("preserves all non-location weights and the recommendation threshold", () => {
    const result = calculateRecommendation(
      { availableBudgetMinor: 1_000, styles: ["Modern"], guestCount: 100, eventType: "evening" },
      { minPriceMinor: 500, maxPriceMinor: 1_000, styles: ["Modern"], minGuestCapacity: 50, maxGuestCapacity: 150, eventTypes: ["evening"], ratingAverage: 4.5 },
    );
    expect(result.reasons.map(reason => [reason.dimension, reason.availableWeight])).toEqual([
      ["budget", 20], ["style", 20], ["capacity", 15], ["eventType", 10], ["rating", 10],
    ]);
    expect(result.score).toBe(100);
    expect(result.isRecommended).toBe(true);
  });

  it("multiplies per-guest prices by the Couple guest count", () => {
    const result = calculateRecommendation(
      {
        availableBudgetMinor: 12_000_000,
        guestCount: 300,
      },
      {
        pricePerGuest: true,
        minPriceMinor: 30_000,
        maxPriceMinor: 50_000,
      },
    );

    expect(result.applicableDimensions).toContain("budget");
    expect(result.score).toBe(50);
    expect(result.isRecommended).toBe(false);
  });

  it.each([
    { name: "fully fits", budget: 15_000_000, maximum: 50_000, score: 100 },
    { name: "exceeds the budget", budget: 8_000_000, maximum: 50_000, score: 0 },
    { name: "uses the minimum when the maximum is missing", budget: 9_000_000, maximum: null, score: 100 },
  ])("calculates a per-guest range that $name", ({ budget, maximum, score }) => {
    const result = calculateRecommendation(
      { availableBudgetMinor: budget, guestCount: 300 },
      { pricePerGuest: true, minPriceMinor: 30_000, maxPriceMinor: maximum },
    );

    expect(result.applicableDimensions).toContain("budget");
    expect(result.score).toBe(score);
  });

  it("does not multiply package prices by the guest count", () => {
    const result = calculateRecommendation(
      {
        availableBudgetMinor: 1_500_000,
        guestCount: 300,
      },
      {
        minPriceMinor: 900_000,
        maxPriceMinor: 1_200_000,
      },
    );

    expect(result.applicableDimensions).toContain("budget");
    expect(result.score).toBe(100);
  });

  it("omits per-guest budget scoring when guest count is missing", () => {
    const result = calculateRecommendation(
      {
        availableBudgetMinor: 12_000_000,
      },
      {
        pricePerGuest: true,
        minPriceMinor: 30_000,
        maxPriceMinor: 50_000,
      },
    );

    expect(result.applicableDimensions).not.toContain("budget");
    expect(result.score).toBeNull();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "omits per-guest budget scoring for an invalid guest count (%s)",
    (guestCount) => {
      const result = calculateRecommendation(
        { availableBudgetMinor: 12_000_000, guestCount },
        { pricePerGuest: true, minPriceMinor: 30_000, maxPriceMinor: 50_000 },
      );

      expect(result.applicableDimensions).not.toContain("budget");
    },
  );
});
