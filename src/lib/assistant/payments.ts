type UnpaidPayment = { amountMinor: number; dueDate: string | null };

// Date-only deadlines use the Israel calendar, independent of server timezone.
// Due today is upcoming, never overdue. Inputs contain only unpaid records.
export function israelCalendarDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function classifyUnpaidPayments<T extends UnpaidPayment[]>(payments: T, now = new Date()) {
  const today = israelCalendarDate(now);
  const sorted: T[number][] = payments.toSorted((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  return {
    overdue: sorted.filter((payment) => payment.dueDate && payment.dueDate < today),
    upcoming: sorted.filter((payment) => payment.dueDate && payment.dueDate >= today),
    undated: sorted.filter((payment) => !payment.dueDate),
  };
}
