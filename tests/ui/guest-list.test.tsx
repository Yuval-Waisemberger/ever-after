import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GuestStatusPill } from "@/components/guests/guest-status-pill";
import { GuestDashboardSummary } from "@/components/guests/guest-dashboard-summary";

describe("Guest List UI", () => {
  it("renders user-facing labels rather than enum values", () => {
    const labels = [
      renderToStaticMarkup(<GuestStatusPill status="not_invited" />),
      renderToStaticMarkup(<GuestStatusPill status="invited" />),
      renderToStaticMarkup(<GuestStatusPill status="attending" />),
      renderToStaticMarkup(<GuestStatusPill status="not_attending" />),
    ].join(" ");
    expect(labels).toContain("Not invited");
    expect(labels).toContain("Awaiting response");
    expect(labels).toContain("Attending");
    expect(labels).toContain("Not attending");
    expect(labels).not.toContain("not_attending");
  });

  it("renders compact zero and non-zero Our Wedding summaries", () => {
    const empty = renderToStaticMarkup(<GuestDashboardSummary summary={{ invitationParties: 0, invited: 0, attending: 0, awaitingResponse: 0, notAttending: 0, notYetInvited: 0 }} />);
    const active = renderToStaticMarkup(<GuestDashboardSummary summary={{ invitationParties: 3, invited: 7, attending: 4, awaitingResponse: 2, notAttending: 1, notYetInvited: 0 }} />);

    expect(empty).toContain("Start your guest list");
    expect(empty).not.toContain(">0<");
    expect(active).toContain("Invited");
    expect(active).toContain("Attending");
    expect(active).toContain("Awaiting response");
    expect(active).toContain("Not attending");
    for (const value of [7, 4, 2, 1]) expect(active).toContain(`>${value}<`);
  });
});
