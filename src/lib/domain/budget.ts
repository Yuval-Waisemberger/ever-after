export type PaymentForBudget = {
  amountMinor: number;
  isPaid: boolean;
  dueDate?: string | null;
};

export type BudgetItemForSummary = {
  estimatedAmountMinor?: number | null;
  committedAmountMinor?: number | null;
  payments?: PaymentForBudget[];
};

export type BudgetSummary = {
  totalBudgetMinor: number | null;
  projectedMinor: number;
  committedMinor: number;
  paidMinor: number;
  availableMinor: number | null;
  remainingCommittedMinor: number;
  upcomingPayments: PaymentForBudget[];
};

function asMoney(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function calculateBudgetSummary(
  totalBudgetMinor: number | null,
  items: BudgetItemForSummary[],
): BudgetSummary {
  const projectedMinor = items.reduce((total, item) => {
    const committed = asMoney(item.committedAmountMinor);
    return total + (committed > 0 ? committed : asMoney(item.estimatedAmountMinor));
  }, 0);

  const committedMinor = items.reduce(
    (total, item) => total + asMoney(item.committedAmountMinor),
    0,
  );

  const payments = items.flatMap((item) => item.payments ?? []);
  const paidMinor = payments.reduce(
    (total, payment) => total + (payment.isPaid ? asMoney(payment.amountMinor) : 0),
    0,
  );

  const upcomingPayments = payments
    .filter((payment) => !payment.isPaid)
    .toSorted((left, right) => {
      if (!left.dueDate && !right.dueDate) return 0;
      if (!left.dueDate) return 1;
      if (!right.dueDate) return -1;
      return left.dueDate.localeCompare(right.dueDate);
    });

  const normalizedTotal = totalBudgetMinor == null ? null : asMoney(totalBudgetMinor);

  return {
    totalBudgetMinor: normalizedTotal,
    projectedMinor,
    committedMinor,
    paidMinor,
    availableMinor: normalizedTotal == null ? null : normalizedTotal - committedMinor,
    remainingCommittedMinor: Math.max(committedMinor - paidMinor, 0),
    upcomingPayments,
  };
}

export function formatIls(amountMinor: number | null): string {
  if (amountMinor == null) return "Not set";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}
