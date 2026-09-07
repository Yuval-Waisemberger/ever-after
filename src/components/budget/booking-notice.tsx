import Link from "next/link";
import { calculateBudgetImpact, isPaymentScheduleActive, type BudgetItemForSummary } from "@/lib/domain/budget";

export function BudgetBookingNotice({ item, vendorName }: { item: BudgetItemForSummary; vendorName?: string }) {
  const impact = calculateBudgetImpact(item);
  const active = isPaymentScheduleActive(item);
  return <div className="mt-3 space-y-2 text-sm text-ink-soft">
    {item.source === "booked_vendor" ? <p>Booking commitment{vendorName ? <> · <bdi>{vendorName}</bdi></> : null}. Manage the agreed price in <Link href="/vendors/my" className="font-semibold text-wine underline">Our Vendors</Link>.</p> : null}
    {!active ? <p>Inactive booking. Unpaid schedules are retained for history and are not upcoming obligations. Recorded payments still reduce available funds.</p> : null}
    {impact.paidExceedsCommitment || (active && impact.scheduledExceedsCommitment) ? <p role="status" className="rounded-lg border border-gold/50 bg-[#F8F1E6] px-3 py-2 text-wine">
      Review payments: {impact.paidExceedsCommitment ? "recorded payments exceed the active commitment. " : ""}
      {active && impact.scheduledExceedsCommitment ? "The payment schedule exceeds the active commitment. " : ""}
      Payment history is unchanged; no refund has been assumed.
    </p> : null}
  </div>;
}
