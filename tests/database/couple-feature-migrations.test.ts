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

  it("protects guests with wedding ownership and keeps Paid separate from commitment sync", () => {
    expect(guestSql).toContain('create policy "guests_owner_all"');
    expect(guestSql).toContain("public.owns_wedding(wedding_id)");
    expect(budgetSql).toContain("committed_amount_minor");
    expect(budgetSql).not.toContain("insert into public.payments");
    expect(budgetSql).not.toContain("update public.payments");
  });
});
