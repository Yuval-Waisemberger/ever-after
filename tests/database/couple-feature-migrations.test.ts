import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const identitySql = readFileSync(
  "supabase/migrations/202609050001_couple_identity_and_external_vendors.sql",
  "utf8",
);
const guestSql = readFileSync(
  "supabase/migrations/202609050002_guest_list.sql",
  "utf8",
);
const budgetSql = readFileSync(
  "supabase/migrations/202609050003_booked_vendor_budget_sync.sql",
  "utf8",
);

function getEnumValues(sql: string, enumName: string) {
  const match = sql.match(
    new RegExp(`create type public\\.${enumName} as enum \\(([\\s\\S]*?)\\);`),
  );

  expect(match, `${enumName} enum declaration`).not.toBeNull();

  return [...(match?.[1] ?? "").matchAll(/'([^']+)'/g)].map(
    ([, value]) => value,
  );
}

type GuestRsvpStatus =
  | "not_invited"
  | "invited"
  | "attending"
  | "not_attending";

function hasMeaningfulGuestName(value: string) {
  const meaningfulValue = value.replace(/^\s+|\s+$/gu, "");
  return meaningfulValue.length >= 1 && meaningfulValue.length <= 160;
}

function isValidAttendanceState(
  status: GuestRsvpStatus,
  invitedCount: number,
  attendingCount: number | null,
) {
  if (invitedCount < 1 || invitedCount > 20) {
    return false;
  }

  if (status === "not_invited" || status === "invited") {
    return attendingCount === null;
  }

  if (status === "attending") {
    return (
      attendingCount !== null &&
      attendingCount >= 1 &&
      attendingCount <= invitedCount
    );
  }

  return attendingCount === 0;
}

describe("Couple feature migration source contracts (not a live database test)", () => {
  it("keeps external vendors Couple-owned and separate from public marketplace profiles", () => {
    expect(identitySql).toContain("create table public.external_vendors");
    expect(identitySql).toContain('create policy "external_vendors_owner_all"');
    expect(identitySql).toContain("num_nonnulls(vendor_id, external_vendor_id) = 1");
    expect(identitySql).not.toContain("insert into public.vendor_profiles");
  });

  it("makes Couple media private and requires an owner-scoped object path", () => {
    expect(identitySql).toContain("'couple-media'");
    expect(identitySql).toContain("false,");
    expect(identitySql).toContain("public.can_manage_couple_media(name)");
  });

  it("keeps the Guest List RSVP and side enums canonical and intentionally small", () => {
    expect(getEnumValues(guestSql, "guest_rsvp_status")).toEqual([
      "not_invited",
      "invited",
      "attending",
      "not_attending",
    ]);
    expect(getEnumValues(guestSql, "guest_side")).toEqual([
      "partner_one",
      "partner_two",
      "both",
    ]);
  });

  it("models one invitation party with export-ready contact and grouping fields", () => {
    for (const field of [
      "full_name text not null",
      "party_name text",
      "guest_group text",
      "side public.guest_side",
      "phone text",
      "email text",
      "invited_count smallint not null default 1",
      "attending_count smallint",
      "dietary_notes text",
      "private_notes text",
    ]) {
      expect(guestSql).toContain(field);
    }

    expect(guestSql).toContain(
      "One row represents one invitation party or household.",
    );
    expect(guestSql).not.toContain("create table public.guest_members");
    expect(guestSql).not.toContain("create table public.households");
  });

  it("rejects whitespace-only names and enforces field length limits", () => {
    expect(guestSql).toContain(
      "regexp_replace(full_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')",
    );
    expect(guestSql).not.toContain("btrim(full_name)");
    expect(guestSql).toContain("between 1 and 160");
    expect(guestSql).toContain("char_length(party_name) <= 120");
    expect(guestSql).toContain("char_length(guest_group) <= 80");
    expect(guestSql).toContain("char_length(phone) <= 40");
    expect(guestSql).toContain("char_length(email) <= 254");
    expect(guestSql).toContain("char_length(dietary_notes) <= 2000");
    expect(guestSql).toContain("char_length(private_notes) <= 3000");
  });

  it.each(["", " ", "\t", "\n", " \t\n "])(
    "rejects a non-meaningful full_name value: %j",
    (fullName) => {
      expect(hasMeaningfulGuestName(fullName)).toBe(false);
    },
  );

  it.each([
    "Dana",
    "  Dana & Tom  ",
    "Cohen\tFamily",
    ` ${"A".repeat(160)} `,
  ])("accepts a meaningful full_name value: %j", (fullName) => {
    expect(hasMeaningfulGuestName(fullName)).toBe(true);
  });

  it("rejects a full_name over the maximum meaningful length", () => {
    expect(hasMeaningfulGuestName("A".repeat(161))).toBe(false);
  });

  it("keeps RSVP status and confirmed attendance counts consistent", () => {
    expect(guestSql).toContain("invited_count between 1 and 20");
    expect(guestSql).toContain(
      "attending_count is null or attending_count between 0 and 20",
    );
    expect(guestSql).toContain(
      "rsvp_status in ('not_invited', 'invited') and attending_count is null",
    );
    expect(guestSql).toContain(
      "rsvp_status = 'attending'\n      and attending_count is not null\n      and attending_count between 1 and invited_count",
    );
    expect(guestSql).toContain(
      "rsvp_status = 'not_attending'\n      and attending_count is not null\n      and attending_count = 0",
    );
    expect(guestSql).not.toContain("attending_count = invited_count");
  });

  it.each<[GuestRsvpStatus, number, number | null]>([
    ["not_invited", 1, null],
    ["invited", 5, null],
    ["attending", 1, 1],
    ["attending", 5, 3],
    ["not_attending", 4, 0],
  ])(
    "accepts RSVP/count state %s with invited=%i and attending=%s",
    (status, invitedCount, attendingCount) => {
      expect(
        isValidAttendanceState(status, invitedCount, attendingCount),
      ).toBe(true);
    },
  );

  it.each<[GuestRsvpStatus, number, number | null]>([
    ["not_invited", 1, 0],
    ["invited", 2, 0],
    ["attending", 2, null],
    ["attending", 2, 0],
    ["attending", 2, 3],
    ["not_attending", 2, null],
    ["not_attending", 2, 1],
    ["attending", 0, 1],
    ["attending", 21, 1],
  ])(
    "rejects RSVP/count state %s with invited=%i and attending=%s",
    (status, invitedCount, attendingCount) => {
      expect(
        isValidAttendanceState(status, invitedCount, attendingCount),
      ).toBe(false);
    },
  );

  it("requires both the Couple role and ownership for every Guest List operation", () => {
    expect(guestSql).toContain('create policy "guests_owner_all"');
    expect(guestSql.match(/public\.is_couple_account\(\)/g)).toHaveLength(2);
    expect(guestSql.match(/public\.owns_wedding\(wedding_id\)/g)).toHaveLength(
      2,
    );
    expect(guestSql).toContain("for all to authenticated using (");
    expect(guestSql).toContain("with check (");
  });

  it("keeps wedding ownership, cascade cleanup, and updated-at behavior intact", () => {
    expect(guestSql).toContain(
      "wedding_id uuid not null references public.weddings(id) on delete cascade",
    );
    expect(guestSql).toContain(
      "create trigger guests_updated_at before update on public.guests",
    );
    expect(guestSql).toContain(
      "for each row execute function public.set_updated_at()",
    );
    expect(guestSql).toContain(
      "weddings.guest_count remains a planning estimate and is not automatically synchronized",
    );
  });

  it("keeps Paid separate from booked-vendor commitment sync", () => {
    expect(budgetSql).toContain("committed_amount_minor");
    expect(budgetSql).not.toContain("insert into public.payments");
    expect(budgetSql).not.toContain("update public.payments");
  });
});
