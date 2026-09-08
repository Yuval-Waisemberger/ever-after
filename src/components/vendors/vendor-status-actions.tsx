import { CalendarCheck, CircleX, MailCheck, Scale, Sparkles } from "lucide-react";
import { setVendorStatus } from "@/lib/actions/vendors";
import { FeedbackSettlement } from "./feedback-settlement";
import { BookingFeedback } from "./booking-celebration";
import { SavedVendorButton } from "@/components/vendors/saved-vendor-button";
import { lifecycleFromStoredStatus } from "@/lib/domain/couple-vendors";

const actions = [
  ["saved", "No active status", Sparkles],
  ["contacted", "Contacted", MailCheck],
  ["considering", "Considering", Scale],
  ["booked", "Booked", CalendarCheck],
  ["rejected", "Rejected", CircleX],
] as const;

export function VendorStatusActions({ vendorId, currentStatus, isSaved, returnTo, businessName = "This vendor" }: { vendorId: string; currentStatus?: string | null; isSaved: boolean; returnTo: string; businessName?: string }) {
  const lifecycleStatus = lifecycleFromStoredStatus(currentStatus as Parameters<typeof lifecycleFromStoredStatus>[0]);
  return (
    <BookingFeedback status={currentStatus} businessName={businessName}><div className="vendor-status-actions">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Your vendor relationship</p><SavedVendorButton vendorId={vendorId} isSaved={isSaved} returnTo={returnTo} /></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map(([status, label, Icon]) => (
          <form action={setVendorStatus} key={status}><FeedbackSettlement />
            <input type="hidden" name="vendorId" value={vendorId} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="agreedPriceShekels" value="" />
            <input type="hidden" name="privateNotes" value="" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition ${(status === "saved" ? lifecycleStatus == null : lifecycleStatus === status) ? "border-wine bg-wine text-white" : "bg-paper hover:border-wine hover:text-wine"}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          </form>
        ))}
      </div>
    </div></BookingFeedback>
  );
}
