import { describe, expect, it } from "vitest";
import { calculateTaskCompletionPercentage, isDueWithinDays } from "@/lib/domain/tasks";

describe("task summaries", () => {
  it("calculates completion from tasks, not wedding progress", () => {
    expect(
      calculateTaskCompletionPercentage([
        { status: "completed" },
        { status: "completed" },
        { status: "open" },
      ]),
    ).toBe(67);
    expect(calculateTaskCompletionPercentage([])).toBe(0);
  });

  it("counts today through seven days from today", () => {
    const today = new Date("2026-09-02T18:00:00Z");
    expect(isDueWithinDays("2026-09-02", today, 7)).toBe(true);
    expect(isDueWithinDays("2026-09-09", today, 7)).toBe(true);
    expect(isDueWithinDays("2026-09-10", today, 7)).toBe(false);
  });
});
