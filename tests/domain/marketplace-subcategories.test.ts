import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({ configured: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("@/lib/auth/user", () => ({ getCurrentProfile: async () => null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => createSupabaseClient(
  "https://example.supabase.co", "test-public-key",
  { global: { fetch: mocks.fetch }, auth: { persistSession: false, autoRefreshToken: false } },
) }));
import { getMarketplace, getMarketplaceSubcategories } from "@/lib/queries/vendors";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  mocks.configured.mockReturnValue(true);
  mocks.fetch.mockImplementation(async () => new Response("[]", {
    status: 200, headers: { "content-type": "application/json", "content-range": "0-0/22" },
  }));
});
afterEach(() => vi.unstubAllEnvs());
const request = () => new URL(String(mocks.fetch.mock.calls[0][0]));

describe("connected marketplace subcategory query", () => {
  it("filters parent vendors with an inner join before count and pagination", async () => {
    const result = await getMarketplace({ category: "photography-content", subcategory: "wedding-photographers", page: 2 });
    const params = request().searchParams;
    expect(params.get("select")).toContain("vendor_subcategories!inner(slug,name)");
    expect(params.get("vendor_subcategories.slug")).toBe("eq.wedding-photographers");
    expect(params.get("vendor_categories.slug")).toBe("eq.photography-content");
    expect(params.get("offset")).toBe("12");
    expect(params.get("limit")).toBe("12");
    expect(result).toMatchObject({ total: 22, isPreview: false, pageSize: 12 });
  });

  it("preserves the left join when no subcategory is selected", async () => {
    await getMarketplace({ category: "venues", page: 1 });
    expect(request().searchParams.get("select")).toContain("vendor_subcategories(slug,name)");
    expect(request().searchParams.has("vendor_subcategories.slug")).toBe(false);
  });

  it("supports subcategory-only URLs and composes the existing filters", async () => {
    await getMarketplace({ page: 1, subcategory: "videographers", search: "Films", area: "central_israel", minPrice: 1000, maxPrice: 10000, minRating: 4, service: "Drone", guestCount: 100, friday: true });
    const params = request().searchParams;
    expect(params.has("vendor_categories.slug")).toBe(false);
    expect(params.get("vendor_subcategories.slug")).toBe("eq.videographers");
    expect(params.getAll("or").join(" ")).toContain("business_name.ilike.%Films%");
    expect(params.getAll("or").join(" ")).toContain("service_areas.cs.{central_israel}");
    expect(params.get("min_price_minor")).toBe("lte.1000000");
    expect(params.get("max_price_minor")).toBe("gte.100000");
    expect(params.get("services")).toBe("cs.{Drone}");
    expect(params.get("friday_available")).toBe("eq.true");
    expect(params.get("min_guest_capacity")).toBe("lte.100");
    expect(params.get("max_guest_capacity")).toBe("gte.100");
  });

  it("surfaces database errors rather than falling back to demo data", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ message: "query failed", code: "XX000" }), { status: 400 }));
    await expect(getMarketplace({ subcategory: "flowers", page: 1 })).rejects.toThrow("marketplace could not be loaded");
    await expect(getMarketplaceSubcategories()).rejects.toThrow("subcategories could not be loaded");
  });

  it("gets selector choices from the real public taxonomy", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify([{ slug: "flowers", name: "Flowers", vendor_categories: { slug: "design-flowers" } }]), { status: 200 }));
    expect(await getMarketplaceSubcategories()).toEqual([{ slug: "flowers", name: "Flowers", categorySlug: "design-flowers" }]);
    expect(request().pathname).toBe("/rest/v1/vendor_subcategories");
  });

  it("preserves disconnected taxonomy and subcategory pagination", async () => {
    mocks.configured.mockReturnValue(false);
    const taxonomy = await getMarketplaceSubcategories();
    expect(taxonomy).toHaveLength(19);
    expect(taxonomy.filter(item => item.categorySlug === "photography-content")).toHaveLength(4);
    const result = await getMarketplace({ subcategory: "wedding-photographers", page: 2 });
    expect(result).toMatchObject({ total: 22, isPreview: true });
    expect(result.vendors).toHaveLength(10);
    expect(result.vendors.every(vendor => vendor.subcategorySlug === "wedding-photographers")).toBe(true);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
