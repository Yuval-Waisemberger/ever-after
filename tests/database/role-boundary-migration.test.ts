import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const sql = readFileSync("supabase/migrations/202609070002_role_boundary_hardening.sql", "utf8");
it("intersects existing RLS with role checks without granting broader table access", () => {
  expect(sql).toContain("weddings_couple_role on public.weddings as restrictive");
  expect(sql).toContain("public.is_couple_account() and exists");
  expect(sql).toContain("public.is_vendor_account() and exists");
  expect(sql).not.toMatch(/disable row level security|grant .* on (?:table )?public\.(?:weddings|profiles)|create table|add column/i);
});
it("protects privileged booking reads and cross-role delete cascades transactionally", () => {
  expect(sql).toContain("couple_vendors_visible_insert");
  expect(sql).toContain("v.is_public");
  expect(sql.match(/on delete restrict/g)).toHaveLength(2);
  expect(sql).toMatch(/begin;[\s\S]*commit;/);
  expect(sql).not.toMatch(/^\s*(insert into|update|delete from)\s+public\./im);
});
