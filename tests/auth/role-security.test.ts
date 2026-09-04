import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("profile role security migration contract (not a live database test)", () => {
  const sql = readFileSync("supabase/migrations/202609040001_profile_role_permissions.sql", "utf8");
  it("removes table-wide updates including role for both authenticated account types", () => {
    expect(sql).toMatch(/revoke update on table public\.profiles from authenticated;/i);
    expect(sql).not.toMatch(/grant update on (?:table )?public\.profiles/i);
    expect(sql).not.toMatch(/grant update\s*\([^)]*\brole\b/i);
  });
  it("allows only legitimate profile edit columns under existing own-row RLS", () => {
    expect(sql).toMatch(/grant update \(display_name, phone\) on table public\.profiles to authenticated;/i);
    const rls = readFileSync("supabase/migrations/202609020002_rls_and_storage.sql", "utf8");
    expect(rls).toContain('create policy "profiles_update_own"');
    expect(sql).not.toMatch(/disable row level security|drop policy|replace function/i);
  });
});
