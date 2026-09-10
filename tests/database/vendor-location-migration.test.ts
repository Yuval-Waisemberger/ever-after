import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202609110001_vendor_location_model.sql", "utf8");
const profileAction = readFileSync("src/lib/actions/vendor-profile.ts", "utf8");

describe("Vendor location migration contracts", () => {
  it("is additive, locked, and refuses unsafe fixed-location backfills", () => {
    expect(migration).toMatch(/begin;\s*\n\s*lock table public\.vendor_profiles/i);
    expect(migration).toContain("create type public.vendor_location_mode as enum ('fixed', 'mobile')");
    expect(migration).toContain("add column location_mode");
    expect(migration).toContain("add column physical_area");
    expect(migration).toContain("cardinality(v.service_areas) <> 1");
    expect(migration).toContain("v.service_areas[1] = 'flexible'");
    expect(migration).not.toMatch(/drop\s+(?:column|table|type)/i);
    expect(migration.trim()).toMatch(/commit;$/);
  });

  it("backfills the approved taxonomy and adds only the fixed-area query index", () => {
    expect(migration.match(/'wedding-venues', 'preparation-hotels'/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migration).toContain("then 'fixed'::public.vendor_location_mode");
    expect(migration).toContain("else 'mobile'::public.vendor_location_mode");
    expect(migration).toContain("vendor_profiles_public_fixed_area_idx");
    expect(migration).toContain("where is_public and location_mode = 'fixed'");
  });

  it("preserves RLS and enforces safe row invariants", () => {
    expect(migration).not.toMatch(/(?:alter|create|drop) policy/i);
    expect(migration).not.toMatch(/disable row level security/i);
    expect(migration).toContain("vendor_profiles_physical_area_not_flexible");
    expect(migration).toContain("vendor_profiles_mobile_has_no_physical_area");
    expect(migration).toContain("vendor_profiles_service_areas_flexible_exclusive");
    expect(migration).toContain("vendor_profiles_published_fixed_location_complete");
  });

  it("derives location mode from the server-read subcategory, never a browser field", () => {
    expect(profileAction).toContain('.from("vendor_subcategories")');
    expect(profileAction).toContain("locationModeForSubcategory(subcategorySlug)");
    expect(profileAction).not.toContain('formData.get("locationMode")');
  });
});
