import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as scoring from "@/lib/domain/recommendation";

const mocks = vi.hoisted(() => ({ configured: vi.fn(), fetch: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("@/lib/auth/user", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => createSupabaseClient(
  "https://example.supabase.co", "test-public-key",
  { global: { fetch: mocks.fetch }, auth: { persistSession: false, autoRefreshToken: false } },
) }));
import { getMarketplace, getMarketplaceSubcategories } from "@/lib/queries/vendors";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue(null);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  mocks.configured.mockReturnValue(true);
  mocks.fetch.mockImplementation(async () => new Response("[]", {
    status: 200, headers: { "content-type": "application/json", "content-range": "0-0/22" },
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const request = () => new URL(String(mocks.fetch.mock.calls[0][0]));

describe("connected marketplace subcategory query", () => {
  it.each([false, true])("uses paid budget impact for matching, with unknown finance on failure=%s", async unavailable => {
    mocks.profile.mockResolvedValue({ role: "couple" });
    const spy = vi.spyOn(scoring, "calculateRecommendation");
    mocks.fetch.mockImplementation(async (input: string) => {
      const url = new URL(String(input));
      const table = url.pathname.split("/").at(-1);
      const rows = table === "weddings" ? { id: "wedding", total_budget_minor: 170000, styles: [], preferred_area: null, guest_count: null, event_type: null }
        : table === "budget_items" ? [{ committed_amount_minor: null, payments: [{ amount_minor: 20000, is_paid: true }] }]
        : table === "couple_vendors" ? []
        : [{ id: "vendor", slug: "studio", business_name: "Studio", is_public: true, vendor_categories: { slug: "photography-content", name: "Photography" }, vendor_images: [], reviews: [] }];
      return new Response(JSON.stringify(unavailable && table === "budget_items" ? { message: "private failure" } : rows), { status: unavailable && table === "budget_items" ? 400 : 200, headers: { "content-type": "application/json", "content-range": "0-0/1" } });
    });
    await getMarketplace({ page: 1 });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ availableBudgetMinor: unavailable ? null : 150000 }), expect.anything());
  });
  it.each([
    { categorySlug: "venues", subcategorySlug: "wedding-venues", pricePerGuest: true },
    { categorySlug: "event-services", subcategorySlug: "preparation-hotels", pricePerGuest: false },
  ])("classifies $subcategorySlug pricing from its canonical category", async ({ categorySlug, subcategorySlug, pricePerGuest }) => {
    mocks.profile.mockResolvedValue({ role: "couple" });
    const spy = vi.spyOn(scoring, "calculateRecommendation");
    mocks.fetch.mockImplementation(async (input: string) => {
      const table = new URL(String(input)).pathname.split("/").at(-1);
      const rows = table === "weddings"
        ? { id: "wedding", total_budget_minor: 12_000_000, styles: [], preferred_area: null, guest_count: 300, event_type: null }
        : table === "budget_items" || table === "couple_vendors"
          ? []
          : [{
              id: "vendor", slug: "vendor", business_name: "Vendor", is_public: true,
              min_price_minor: 30_000, max_price_minor: 50_000,
              vendor_categories: { slug: categorySlug, name: "Category" },
              vendor_subcategories: { slug: subcategorySlug, name: "Subcategory" },
              vendor_images: [], reviews: [],
            }];
      return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json", "content-range": "0-0/1" } });
    });

    const result = await getMarketplace({ page: 1 });

    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ pricePerGuest }));
    expect(result.vendors[0].recommendation?.score).toBe(pricePerGuest ? 50 : 100);
  });
  it("filters the column-limited public Vendor view before count and pagination", async () => {
    const result = await getMarketplace({ category: "photography-content", subcategory: "wedding-photographers", page: 2 });
    const params = request().searchParams;
    expect(params.get("select")).toContain("subcategory_slug");
    expect(params.get("select")).not.toContain("owner_user_id");
    expect(params.get("subcategory_slug")).toBe("eq.wedding-photographers");
    expect(params.get("category_slug")).toBe("eq.photography-content");
    expect(params.get("offset")).toBe("12");
    expect(params.get("limit")).toBe("12");
    expect(result).toMatchObject({ total: 22, isPreview: false, pageSize: 12 });
  });

  it.each(["price_asc", "price_desc"] as const)("orders category starting prices %s before bounded pagination with unknown prices last", async sort => {
    await getMarketplace({ category:"venues", sort, page:2 });
    const params=request().searchParams;
    expect(params.get("order")).toBe(`min_price_minor.${sort === "price_asc" ? "asc" : "desc"}.nullslast,id.asc`);
    expect(params.get("offset")).toBe("12"); expect(params.get("limit")).toBe("12");
  });
  it("does not compare category price units across the whole directory", async () => {
    await getMarketplace({sort:"price_desc",page:1});
    expect(request().searchParams.get("order")).toBe("business_name.asc,id.asc");
  });
  it("sorts the demo category before pagination with identical deterministic ordering", async () => {
    mocks.configured.mockReturnValue(false);
    const first=await getMarketplace({category:"venues",sort:"price_asc",page:1});
    const second=await getMarketplace({category:"venues",sort:"price_asc",page:2});
    const amounts=[...first.vendors,...second.vendors].map(v=>v.minPriceMinor!);
    expect(amounts).toEqual([...amounts].sort((a,b)=>a-b)); expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("does not add a subcategory predicate when none is selected", async () => {
    await getMarketplace({ category: "venues", page: 1 });
    expect(request().searchParams.get("select")).toContain("subcategory_slug");
    expect(request().searchParams.has("subcategory_slug")).toBe(false);
  });

  it("supports subcategory-only URLs and composes the existing filters", async () => {
    await getMarketplace({ page: 1, subcategory: "videographers", search: "Films", area: "central_israel", minPrice: 1000, maxPrice: 10000, minRating: 4, service: "Drone", guestCount: 100, friday: true });
    const params = request().searchParams;
    expect(params.has("category_slug")).toBe(false);
    expect(params.get("subcategory_slug")).toBe("eq.videographers");
    expect(params.getAll("or").join(" ")).toContain("business_name.ilike.%Films%");
    expect(params.getAll("or").join(" ")).toContain("location_mode.eq.fixed");
    expect(params.getAll("or").join(" ")).toContain("physical_area.eq.central_israel");
    expect(params.getAll("or").join(" ")).toContain("location_mode.eq.mobile");
    expect(params.getAll("or").join(" ")).toContain("service_areas.ov.{central_israel,flexible}");
    expect(params.get("min_price_minor")).toBe("lte.1000000");
    expect(params.get("max_price_minor")).toBe("gte.100000");
    expect(params.get("services")).toBe("cs.{Drone}");
    expect(params.get("friday_available")).toBe("eq.true");
    expect(params.get("min_guest_capacity")).toBe("lte.100");
    expect(params.get("max_guest_capacity")).toBe("gte.100");
  });

  it("filters calculated ratings before pagination and reports the filtered total", async () => {
    const rows = [
      { id: "high", slug: "high-rated", business_name: "High Rated", category_slug: "photography-content", category_name: "Photography & Content", subcategory_slug: "wedding-photographers", subcategory_name: "Wedding Photographers" },
      { id: "low", slug: "low-rated", business_name: "Low Rated", category_slug: "photography-content", category_name: "Photography & Content", subcategory_slug: "wedding-photographers", subcategory_name: "Wedding Photographers" },
    ];
    mocks.fetch.mockImplementation(async (input: string) => {
      const table = new URL(String(input)).pathname.split("/").at(-1);
      const response = table === "public_vendor_profiles" ? rows
        : table === "public_vendor_images" ? []
        : table === "public_vendor_reviews" ? [
            { id: "review-high", vendor_id: "high", reviewer_display_name: "Couple", professionalism: 5, punctuality: 5, service_attitude: 5, value_for_money: 5, would_choose_again: true, review_text: null, created_at: "2026-01-01" },
            { id: "review-low", vendor_id: "low", reviewer_display_name: "Couple", professionalism: 3, punctuality: 3, service_attitude: 3, value_for_money: 3, would_choose_again: false, review_text: null, created_at: "2026-01-01" },
          ]
        : [];
      return new Response(JSON.stringify(response), {
        status: 200, headers: { "content-type": "application/json", "content-range": "0-1/22" },
      });
    });

    const result = await getMarketplace({ subcategory: "wedding-photographers", minRating: 4.5, page: 1 });

    expect(request().searchParams.has("limit")).toBe(false);
    expect(result.total).toBe(1);
    expect(result.vendors.map((vendor) => vendor.slug)).toEqual(["high-rated"]);
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
    expect(taxonomy).toHaveLength(27);
    expect(taxonomy.filter(item => item.categorySlug === "photography-content")).toHaveLength(4);
    const result = await getMarketplace({ subcategory: "wedding-photographers", page: 2 });
    expect(result).toMatchObject({ total: 22, isPreview: true });
    expect(result.vendors).toHaveLength(10);
    expect(result.vendors.every(vendor => vendor.subcategorySlug === "wedding-photographers")).toBe(true);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("does not forward an invalid area URL value to Supabase", async () => {
    const { parseVendorFilters } = await import("@/lib/vendors/filters");
    await getMarketplace(parseVendorFilters({ area: "not-a-region" }));
    expect(request().searchParams.getAll("or").join(" ")).not.toContain("not-a-region");
  });
});
