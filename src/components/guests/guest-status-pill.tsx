import { GUEST_RSVP_LABELS, type GuestRsvpStatus } from "@/lib/domain/guests";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";

const statusTone: Record<GuestRsvpStatus, StatusTone> = {
  not_invited: "neutral",
  invited: "waiting",
  attending: "success",
  not_attending: "danger",
};

export function GuestStatusPill({ status }: { status: GuestRsvpStatus }) {
  return <StatusPill tone={statusTone[status]}>{GUEST_RSVP_LABELS[status]}</StatusPill>;
}
