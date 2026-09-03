import { Bookmark, CalendarCheck, CircleX, MailCheck, Scale } from "lucide-react";
import { setVendorStatus } from "@/lib/actions/vendors";

const actions = [
  ["saved", "Save", Bookmark],
  ["contacted", "Contacted", MailCheck],
  ["considering", "Considering", Scale],
  ["booked", "Booked", CalendarCheck],
  ["rejected", "Rejected", CircleX],
] as const;

export function VendorStatusActions({ vendorId, currentStatus }: { vendorId: string; currentStatus?: string | null }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Your status</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map(([status, label, Icon]) => (
          <form action={setVendorStatus} key={status}>
            <input type="hidden" name="vendorId" value={vendorId} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="agreedPriceShekels" value="" />
            <input type="hidden" name="privateNotes" value="" />
            <button className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition ${currentStatus === status ? "border-wine bg-wine text-white" : "bg-paper hover:border-wine hover:text-wine"}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
