type UnpaidPayment = { amountMinor: number; dueDate: string | null };

// Date-only deadlines use the Israel calendar, independent of server timezone.
// Due today is upcoming, never overdue. Inputs contain only unpaid records.
export function classifyUnpaidPayments(payments: UnpaidPayment[], now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const sorted = payments.toSorted((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  return {
    overdue: sorted.filter((payment) => payment.dueDate && payment.dueDate < today),
    upcoming: sorted.filter((payment) => payment.dueDate && payment.dueDate >= today),
    undated: sorted.filter((payment) => !payment.dueDate),
  };
}
