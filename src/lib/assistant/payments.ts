import { israelCalendarDate } from "@/lib/domain/calendar";
export { israelCalendarDate } from "@/lib/domain/calendar";
type UnpaidPayment = { amountMinor: number; dueDate: string | null };

// Date-only deadlines use the Israel calendar, independent of server timezone.
// Due today is upcoming, never overdue. Inputs contain only unpaid records.

export function classifyUnpaidPayments<T extends UnpaidPayment[]>(payments: T, now = new Date()) {
  const today = israelCalendarDate(now);
  const sorted: T[number][] = payments.toSorted((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  return {
    overdue: sorted.filter((payment) => payment.dueDate && payment.dueDate < today),
    upcoming: sorted.filter((payment) => payment.dueDate && payment.dueDate >= today),
    undated: sorted.filter((payment) => !payment.dueDate),
  };
}
