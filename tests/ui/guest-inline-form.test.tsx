import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GuestFormToggle } from "@/app/(couple)/guests/guest-form-toggle";
import { GuestSummary } from "@/components/guests/guest-summary";
import { GuestList } from "@/components/guests/guest-list";
import type { GuestRow } from "@/lib/queries/guests";
import { GuestForm } from "@/components/guests/guest-form";
import { saveGuest } from "@/lib/actions/guests";

vi.mock("@/lib/actions/guests", () => ({ deleteGuest: vi.fn(), saveGuest: vi.fn(async () => ({ status: "error", message: "Fixture validation error", errors: { fullName: ["Fixture field error"] } })) }));

describe("Guest inline form", () => {
  it("adds decorative icons and bounds planned progress independently of attendance", () => {
    const summary = { invitationParties: 2, invited: 10, attending: 4, awaitingResponse: 6, notAttending: 0, notYetInvited: 0 };
    for (const [target, percent] of [[20, 50], [5, 100], [null, null], [0, null], [-1, null], [NaN, null], [Infinity, null]] as const) {
      const doc = new DOMParser().parseFromString(renderToStaticMarkup(<GuestSummary summary={summary} estimate={target} />), "text/html");
      expect(doc.querySelectorAll('.guest-metric-icon[aria-hidden="true"] svg')).toHaveLength(4);
      expect(doc.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow") ?? null).toBe(percent == null ? null : String(percent));
      expect(doc.querySelector('.guest-attendance-ring')?.getAttribute("aria-label")).toBe("40% attending: 4 of 10 invited guests");
    }
  });
  it("Clear restores controlled defaults and feedback without submitting or closing", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(saveGuest).mockClear();
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    try {
      await act(async () => root.render(<details open><summary>Guest</summary><GuestForm sideLabels={{ partner_one: "One", partner_two: "Two", both: "Both" }} /></details>));
      const form = host.querySelector("form")!;
      const status = form.querySelector<HTMLSelectElement>('[name="rsvpStatus"]')!;
      await act(async () => { status.value = "attending"; status.dispatchEvent(new Event("change", { bubbles: true })); });
      expect(form.querySelector('[name="attendingCount"]')).not.toBeNull();
      const name = form.querySelector<HTMLInputElement>('[name="fullName"]')!; name.value = "Unsaved draft";
      await act(async () => [...form.querySelectorAll("button")].find(b => b.textContent === "Clear")!.click());
      expect(name.value).toBe("");
      expect(status.value).toBe("not_invited");
      expect(form.querySelector('[name="attendingCount"]')).toBeNull();
      expect(form.querySelector<HTMLInputElement>('[name="invitedCount"]')?.value).toBe("1");
      expect(host.querySelector("details")?.open).toBe(true);
      expect(saveGuest).not.toHaveBeenCalled();
      await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
      expect(saveGuest).toHaveBeenCalledTimes(1);
      expect(form.textContent).toContain("Fixture validation error");
      await act(async () => [...form.querySelectorAll("button")].find(b => b.textContent === "Clear")!.click());
      expect(form.textContent).not.toContain("Fixture validation error");
      expect(form.textContent).not.toContain("Fixture field error");
      expect(saveGuest).toHaveBeenCalledTimes(1);
    } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
  });
  it("retains every party and action in a full page of desktop and mobile rows", () => {
    const guests: GuestRow[] = Array.from({ length: 50 }, (_, index) => ({ id: `fixture-${index}`, full_name: index % 2 ? "משפחה לדוגמה" : `Fixture guest ${index}`, party_name: "Fixture household", guest_group: "Family", side: "both", phone: null, email: "fixture@example.invalid", rsvp_status: "invited", invited_count: 2, attending_count: null, dietary_notes: null, private_notes: null, created_at: "2026-09-10", updated_at: "2026-09-10" }));
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<GuestList guests={guests} partnerOneName="One" partnerTwoName="Two" />), "text/html");
    expect(doc.querySelectorAll("tbody tr")).toHaveLength(50);
    expect(doc.querySelectorAll("article")).toHaveLength(50);
    expect(doc.querySelectorAll('a[aria-label^="Edit "]')).toHaveLength(100);
    expect(doc.querySelectorAll('button[aria-label^="Delete "]')).toHaveLength(100);
    expect(doc.querySelector("thead")?.textContent).toContain("Attending");
  });
  it("toggles the existing details without replacing the draft or animated summary", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div"); document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<><GuestFormToggle initialOpen={false} /><GuestSummary estimate={100} summary={{ invitationParties: 2, invited: 10, attending: 4, awaitingResponse: 6, notAttending: 0, notYetInvited: 0 }} /><details id="guest-form"><summary>Add guest / household</summary><input defaultValue="Unsaved draft" /></details></>));
      const toggle = host.querySelector("button")!;
      const form = host.querySelector("details")!;
      const input = host.querySelector("input")!;
      const ring = host.querySelector(".guest-attendance-ring");
      const values = [...host.querySelectorAll(".planning-value")];
      await act(async () => toggle.click());
      expect(form.open).toBe(true);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      await act(async () => toggle.click());
      expect(form.open).toBe(false);
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(host.querySelector("input")).toBe(input);
      expect(input.value).toBe("Unsaved draft");
      expect(host.querySelector(".guest-attendance-ring")).toBe(ring);
      expect([...host.querySelectorAll(".planning-value")]).toEqual(values);
      expect(host.querySelector("dialog")).toBeNull();
      expect(ring?.getAttribute("aria-label")).toBe("40% attending: 4 of 10 invited guests");
    } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
  });
});
