// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/auth/user", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from }),
}));

import {
  getOwnedVendorProfile,
  getVendorDashboard,
  getVendorIdentity,
} from "@/lib/queries/vendor-dashboard";

const ownedProfile = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "vendor-studio-11111111",
  business_name: "Vendor Studio",
  contact_name: null,
  description: null,
  location_city: null,
  category_id: null,
  subcategory_id: null,
  service_areas: [],
  min_price_minor: null,
  max_price_minor: null,
  services: [],
  styles: [],
  event_types: [],
  min_guest_capacity: null,
  max_guest_capacity: null,
  friday_available: null,
  indoor_available: null,
  outdoor_available: null,
  phone: null,
  email: null,
  website_url: null,
  instagram_url: null,
  is_public: false,
  vendor_images: [],
  reviews: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    role: "vendor",
  });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: ownedProfile, error: null });
});

describe("Vendor first-login profile loading", () => {
  it("filters by the authenticated Vendor owner before requesting at most one row", async () => {
    await expect(getOwnedVendorProfile()).resolves.toEqual(ownedProfile);

    expect(mocks.requireRole).toHaveBeenCalledWith("vendor");
    expect(mocks.from).toHaveBeenCalledWith("vendor_profiles");
    expect(mocks.eq).toHaveBeenCalledWith(
      "owner_user_id",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(mocks.maybeSingle).toHaveBeenCalledOnce();
  });

  it("treats zero owned rows as an explicit setup state", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getOwnedVendorProfile()).resolves.toBeNull();
    await expect(getVendorDashboard()).resolves.toBeNull();
  });

  it("loads the dashboard from the completed automatic profile row", async () => {
    const dashboard = await getVendorDashboard();

    expect(dashboard?.profile).toEqual(ownedProfile);
    expect(dashboard?.completion.percentage).toBe(13);
    expect(dashboard?.reviews).toEqual([]);
  });

  it("keeps genuine PostgREST failures separate from the zero-row state", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST500",
        message: "provider detail",
        details: null,
        hint: null,
      },
    });

    await expect(getOwnedVendorProfile()).rejects.toThrow(
      "Vendor profile could not be loaded.",
    );
  });
});

describe("Vendor onboarding and role boundaries", () => {
  const dashboardPage = readFileSync("src/app/(vendor)/vendor/page.tsx", "utf8");
  const profilePage = readFileSync(
    "src/app/(vendor)/vendor/profile/page.tsx",
    "utf8",
  );
  const profileForm = readFileSync(
    "src/components/vendor/vendor-profile-form.tsx",
    "utf8",
  );
  const profileAction = readFileSync(
    "src/lib/actions/vendor-profile.ts",
    "utf8",
  );
  const schema = readFileSync(
    "supabase/migrations/202609020001_initial_schema.sql",
    "utf8",
  );
  const rls = readFileSync(
    "supabase/migrations/202609020002_rls_and_storage.sql",
    "utf8",
  );

  it("automatically creates a minimal owned profile during Vendor signup", () => {
    expect(schema).toContain("insert into public.vendor_profiles (");
    expect(schema).toContain("owner_user_id,");
    expect(schema).toContain("requested_role = 'couple'");
  });

  it("renders clean setup affordances if an owned profile is exceptionally absent", () => {
    expect(dashboardPage).toContain("Set up your business profile");
    expect(dashboardPage).toContain('href="/vendor/profile"');
    expect(profilePage).toContain("VendorProfileForm");
    expect(profileForm).toContain("Vendor Profile Setup");
    expect(profileForm).toContain("Create business profile");
    expect(profileAction).toContain("owner_user_id: account.id");
    expect(profileAction).toContain("Business profile created.");
  });

  it("keeps profile writes owner-scoped without weakening RLS", () => {
    expect(profileAction).toContain('.eq("owner_user_id", account.id)');
    expect(rls).toContain('create policy "vendors_owner_insert"');
    expect(rls).toContain('create policy "vendors_owner_update"');
    expect(rls).toContain('create policy "vendors_owner_delete"');
    expect(rls.match(/\(select auth\.uid\(\)\) = owner_user_id/g)?.length).toBeGreaterThanOrEqual(4);
    expect(rls).toContain("for select to anon, authenticated using (is_public)");
  });
});


describe("Vendor canonical navigation identity", () => {
  it("reads the saved business name, falling back only for blank names", async () => {
    expect((await getVendorIdentity("Old account name")).displayName).toBe("Vendor Studio");
    mocks.maybeSingle.mockResolvedValue({data:{...ownedProfile,business_name:"   "},error:null});
    expect((await getVendorIdentity("Old account name")).displayName).toBe("Old account name");
  });
});
