import { describe, expect, it } from "vitest";
import { calculateBudgetImpact, calculateBudgetSummary, deriveBudgetItemStatus, derivePaymentStatus } from "@/lib/domain/budget";

describe("calculateBudgetSummary", () => {
  it.each([
    [100_000, 20_000, 100_000], [null, 20_000, 20_000],
    [null, 0, 0], [10_000, 12_000, 12_000], [0, 12_000, 12_000],
  ])("retains spending with commitment %s and paid %s", (committed, paid, impact) => {
    const item = { committedAmountMinor: committed, payments: [{ amountMinor: paid!, isPaid: true }] };
    expect(calculateBudgetImpact(item).budgetImpactMinor).toBe(impact);
    expect(calculateBudgetSummary(170_000, [item]).availableMinor).toBe(170_000 - impact!);
  });

  it("calculates impact per item, not max of global totals", () => {
    const summary = calculateBudgetSummary(170_000, [
      { committedAmountMinor: null, payments: [{ amountMinor: 100_000, isPaid: true }] },
      { committedAmountMinor: 20_000 },
    ]);
    expect(summary).toMatchObject({ committedMinor: 20_000, paidMinor: 100_000, budgetImpactMinor: 120_000, availableMinor: 50_000, remainingCommittedMinor: 20_000 });
  });

  it("preserves the Frankfurt before/after adoption financial snapshot", () => {
    expect(calculateBudgetSummary(17_000_000, [{ source: "booked_vendor", relationshipStatus: "booked", estimatedAmountMinor: 9_000_000, committedAmountMinor: 10_000_000, payments: [{ amountMinor: 10_000_000, isPaid: true }] }]))
      .toMatchObject({ committedMinor: 10_000_000, paidMinor: 10_000_000, availableMinor: 7_000_000 });
  });

  it("excludes inactive unpaid schedules without changing actual paid history; rebooking restores them", () => {
    const item = { source: "booked_vendor" as const, relationshipStatus: "rejected", committedAmountMinor: null, payments: [
      { amountMinor: 20, isPaid: true }, { amountMinor: 80, isPaid: false, dueDate: "2027-01-01" },
    ] };
    expect(calculateBudgetSummary(170, [item])).toMatchObject({ paidMinor: 20, availableMinor: 150, upcomingPayments: [] });
    expect(deriveBudgetItemStatus(item).kind).toBe("inactive");
    expect(calculateBudgetSummary(170, [{ ...item, relationshipStatus: "booked", committedAmountMinor: 100 }]).upcomingPayments).toHaveLength(1);
    expect(item.payments).toHaveLength(2);
  });

  it("flags paid and scheduled discrepancies separately without inventing refunds", () => {
    expect(calculateBudgetImpact({ committedAmountMinor: 10, payments: [{ amountMinor: 12, isPaid: true }] }))
      .toMatchObject({ paidExceedsCommitment: true, scheduledExceedsCommitment: true, paidMinor: 12 });
    expect(calculateBudgetImpact({ committedAmountMinor: 10, payments: [{ amountMinor: 2, isPaid: true }, { amountMinor: 10, isPaid: false }] }))
      .toMatchObject({ paidExceedsCommitment: false, scheduledExceedsCommitment: true, budgetImpactMinor: 10 });
    expect(calculateBudgetSummary(null, []).availableMinor).toBeNull();
  });
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
