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
});
