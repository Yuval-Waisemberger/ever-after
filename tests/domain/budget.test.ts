import { describe, expect, it } from "vitest";
import { calculateBudgetSummary, deriveBudgetItemStatus, derivePaymentStatus } from "@/lib/domain/budget";

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

  it("derives estimated, committed, partially paid and paid from real amounts", () => {
    expect(deriveBudgetItemStatus({ estimatedAmountMinor: 1000 })).toMatchObject({ kind: "estimated", paidMinor: 0 });
    expect(deriveBudgetItemStatus({ committedAmountMinor: 1000 })).toMatchObject({ kind: "committed", paidMinor: 0 });
    expect(deriveBudgetItemStatus({ committedAmountMinor: 1000, payments: [{ amountMinor: 250, isPaid: true }] })).toMatchObject({ kind: "partially_paid", paidMinor: 250 });
    expect(deriveBudgetItemStatus({ committedAmountMinor: 1000, payments: [{ amountMinor: 1000, isPaid: true }] })).toMatchObject({ kind: "paid", paidMinor: 1000 });
  });

  it("never treats booking/commitment as payment and derives payment urgency from dates", () => {
    expect(deriveBudgetItemStatus({ committedAmountMinor: 1200, payments: [] }).kind).toBe("committed");
    const today = new Date("2026-09-02T12:00:00Z");
    expect(derivePaymentStatus({ amountMinor: 100, isPaid: false, dueDate: "2026-09-01" }, today)).toEqual({ kind: "overdue", label: "Overdue 1 day" });
    expect(derivePaymentStatus({ amountMinor: 100, isPaid: false, dueDate: "2026-09-04" }, today)).toEqual({ kind: "due_soon", label: "Due Friday" });
    expect(derivePaymentStatus({ amountMinor: 100, isPaid: true, dueDate: "2026-09-01" }, today)).toEqual({ kind: "paid", label: "Paid" });
  });
});
