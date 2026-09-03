import { describe, expect, it } from "vitest";
import { daysUntilWedding, isWeddingWeek } from "@/lib/domain/wedding-week";

describe("Wedding Week", () => {
  const today = new Date("2027-06-07T20:00:00Z");

  it("is active from seven days before through the wedding day", () => {
    expect(daysUntilWedding("2027-06-14", today)).toBe(7);
    expect(isWeddingWeek("2027-06-14", today)).toBe(true);
    expect(isWeddingWeek("2027-06-15", today)).toBe(false);
  });

  it("is inactive after the wedding and when no date exists", () => {
    expect(isWeddingWeek("2027-06-06", today)).toBe(false);
    expect(isWeddingWeek(null, today)).toBe(false);
  });
});
