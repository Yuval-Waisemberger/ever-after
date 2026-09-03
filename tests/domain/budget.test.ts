import { describe, expect, it } from "vitest";
import { calculateBudgetSummary } from "@/lib/domain/budget";

describe("calculateBudgetSummary", () => {
  it("uses committed amounts for projection and sums paid payments", () => {
    const summary = calculateBudgetSummary(18_000_000, [
      {
        estimatedAmountMinor: 1_400_000,
        committedAmountMinor: 1_200_000,
        payments: [
          { amountMinor: 300_000, isPaid: true, dueDate: "2027-01-01" },
          { amountMinor: 900_000, isPaid: false, dueDate: "2027-06-14" },
        ],
      },
      { estimatedAmountMinor: 800_000, committedAmountMinor: null, payments: [] },
    ]);

    expect(summary.projectedMinor).toBe(2_000_000);
    expect(summary.committedMinor).toBe(1_200_000);
    expect(summary.paidMinor).toBe(300_000);
    expect(summary.availableMinor).toBe(16_800_000);
    expect(summary.remainingCommittedMinor).toBe(900_000);
  });

  it("preserves a negative available amount to show over-budget state", () => {
    expect(
      calculateBudgetSummary(100, [{ committedAmountMinor: 150 }]).availableMinor,
    ).toBe(-50);
  });
});
