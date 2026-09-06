import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const actions = read("src/lib/actions/guests.ts");
const queries = read("src/lib/queries/guests.ts");
const page = read("src/app/(couple)/guests/page.tsx");
const form = read("src/components/guests/guest-form.tsx");
const list = read("src/components/guests/guest-list.tsx");
const shell = read("src/components/layout/app-shell.tsx");
const publicHeaderLinks = read("src/components/layout/public-header-links.ts");
const wedding = read("src/app/(couple)/wedding/page.tsx");
const assistantQuery = read("src/lib/queries/assistant.ts");

describe("Guest List application contracts", () => {
  it("scopes every mutation and detail read to the current owned wedding", () => {
    expect(actions.match(/getOwnedWedding\(\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(actions.match(/\.eq\("wedding_id", wedding\.id\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(actions).toContain('.from("guests").insert(values)');
    expect(actions).toContain('.from("guests").delete()');
    expect(queries).toContain('.eq("wedding_id", wedding.id)');
    expect(queries).toContain("GUESTS_PER_PAGE = 50");
    expect(queries).toContain('.range(from, from + GUESTS_PER_PAGE - 1)');
  });

  it("provides create, edit, confirmed delete, search, filters, and responsive views", () => {
    expect(page).toContain("Add guest / household");
    expect(page).toContain('type="search"');
    expect(page).toContain('name="rsvp"');
    expect(page).toContain('name="group"');
    expect(page).toContain('name="side"');
    expect(form).toContain("Save changes");
    expect(list.includes("window.confirm")).toBe(false);
    expect(read("src/components/guests/delete-guest-button.tsx")).toContain("window.confirm");
    expect(list).toContain("hidden overflow-x-auto");
    expect(list).toContain("lg:hidden");
  });

  it("uses friendly RSVP labels and real wedding names for sides", () => {
    expect(page).toContain("guestSideLabels(wedding.partner_one_name, wedding.partner_two_name)");
    expect(page).not.toContain("Partner One");
    expect(page).not.toContain("Partner Two");
    expect(form).toContain("GUEST_RSVP_LABELS[status]");
  });

  it("keeps Guest List in the Couple sidebar and drawer while removing the redundant icon bar", () => {
    expect(shell).toContain('{ label: "Guest List", href: "/guests"');
    expect(shell).toContain('aria-label={`${role} full mobile navigation`}');
    expect(shell).not.toContain("workspace-bottom-nav");
    expect(shell).not.toContain('aria-label="Mobile navigation"');
  });

  it("adds Our Guests between Our Tasks and Vendors only in the Couple main header", () => {
    expect(publicHeaderLinks).toMatch(/Our Tasks[\s\S]*Our Guests[\s\S]*Vendors/);
    expect(publicHeaderLinks.match(/href: "\/guests"/g)).toHaveLength(1);
  });

  it("replaces only the Our Wedding Saved Vendors card with a compact Guest List card", () => {
    expect(wedding).toContain('title="Guest List"');
    expect(wedding).toContain('summaryLink("/guests"');
    expect(wedding).toContain("getGuestSummary()");
    expect(wedding).toContain("<GuestDashboardSummary summary={guestSummary} />");
    expect(wedding).not.toContain('title="Saved Vendors"');
    expect(wedding).not.toContain('summaryLink("/vendors/my?status=saved"');
    expect(actions).toContain('revalidatePath("/wedding")');
  });

  it("limits Assistant context to aggregate Guest List counts", () => {
    expect(assistantQuery).toContain("guestList: { invited:");
    const guestQuery = queries.slice(queries.indexOf("async function getGuestSummaryRows"), queries.indexOf("export async function getGuestList"));
    expect(guestQuery).toContain("rsvp_status, invited_count, attending_count, guest_group");
    for (const privateField of ["full_name", "party_name", "phone", "email", "dietary_notes", "private_notes"]) expect(guestQuery).not.toContain(privateField);
  });
});
