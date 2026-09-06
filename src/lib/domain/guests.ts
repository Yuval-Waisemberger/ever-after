export const GUEST_RSVP_STATUSES = [
  "not_invited",
  "invited",
  "attending",
  "not_attending",
] as const;

export type GuestRsvpStatus = (typeof GUEST_RSVP_STATUSES)[number];

export const GUEST_SIDES = ["partner_one", "partner_two", "both"] as const;
export type GuestSide = (typeof GUEST_SIDES)[number];

export const GUEST_RSVP_LABELS: Record<GuestRsvpStatus, string> = {
  not_invited: "Not invited",
  invited: "Awaiting response",
  attending: "Attending",
  not_attending: "Not attending",
};

export type GuestSummaryInput = {
  rsvpStatus: GuestRsvpStatus;
  invitedCount: number;
  attendingCount: number | null;
};

export type GuestSummary = {
  invitationParties: number;
  invited: number;
  attending: number;
  awaitingResponse: number;
  notAttending: number;
  notYetInvited: number;
};

export function calculateGuestSummary(guests: GuestSummaryInput[]): GuestSummary {
  return guests.reduce<GuestSummary>((summary, guest) => {
    summary.invitationParties += 1;

    if (guest.rsvpStatus === "not_invited") {
      summary.notYetInvited += guest.invitedCount;
      return summary;
    }

    summary.invited += guest.invitedCount;
    if (guest.rsvpStatus === "invited") summary.awaitingResponse += guest.invitedCount;
    if (guest.rsvpStatus === "attending") {
      const attending = guest.attendingCount ?? 0;
      summary.attending += attending;
      summary.notAttending += Math.max(0, guest.invitedCount - attending);
    }
    if (guest.rsvpStatus === "not_attending") summary.notAttending += guest.invitedCount;
    return summary;
  }, {
    invitationParties: 0,
    invited: 0,
    attending: 0,
    awaitingResponse: 0,
    notAttending: 0,
    notYetInvited: 0,
  });
}

export function guestSideLabels(partnerOneName?: string | null, partnerTwoName?: string | null) {
  const one = partnerOneName?.trim() || "First partner";
  const two = partnerTwoName?.trim() || "Second partner";
  return {
    partner_one: `${one}’s side`,
    partner_two: `${two}’s side`,
    both: "Both",
  } satisfies Record<GuestSide, string>;
}
