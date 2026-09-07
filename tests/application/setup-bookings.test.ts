// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ results: [] as unknown[], calls: [] as Array<{ table: string; op: string; args: unknown[] }>, owned: vi.fn(), refresh: vi.fn(), market: vi.fn(), bookings: vi.fn() }));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.owned }));
vi.mock("@/lib/queries/vendors", () => ({ getMarketplace: mocks.market }));
vi.mock("@/lib/queries/setup-bookings", () => ({ getSetupBookings: mocks.bookings }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from(table: string) {
  const chain: Record<string, unknown> = {};
  for (const op of ["select", "insert", "update", "delete", "eq", "single", "maybeSingle"]) chain[op] = (...args: unknown[]) => { mocks.calls.push({ table, op, args }); return chain; };
  chain.then = (resolve: (x: unknown) => unknown, reject: (x: unknown) => unknown) => { const next = mocks.results.shift(); return (next instanceof Error ? Promise.reject(next) : Promise.resolve(next)).then(resolve, reject); };
  return chain;
} }) }));
import { bookSetupVendor, saveBookingDeclaration, searchSetupVendors } from "@/lib/actions/setup-bookings";
import { completeWeddingSetup, saveWeddingDetails, skipWeddingSetup } from "@/lib/actions/wedding";
const id = "11111111-1111-4111-8111-111111111111";
const ok = (data: unknown = { id }) => ({ data, error: null });
const bad = { data: null, error: { message: "PRIVATE SQL ERROR" } };
const tax = ok({ id: "subcategory", category_id: "parent", vendor_categories: { slug: "photography-content" } });
const booking = { category: "photographer", mode: "marketplace", vendorId: id, subcategory: "wedding-photographers" };
const declaration = ok({ booked_categories: ["Photographer", "DJ"], updated_at: "latest" });
const writes = (table: string) => mocks.calls.filter(c => c.table === table && ["insert", "update", "delete"].includes(c.op));
const form = () => { const f = new FormData(); for (const [k,v] of Object.entries({ revision: "revision", weddingDate: "", guestCount: "200", preferredArea: "north", eventType: "evening", styles: "Romantic", priorities: "Food", totalBudgetShekels: "170000", partnerOneName: "One", partnerTwoName: "Two" })) f.set(k,v); return f; };
beforeEach(() => {
  vi.clearAllMocks(); mocks.results.length = 0; mocks.calls.length = 0;
  mocks.owned.mockResolvedValue({ id: "owned", updated_at: "revision", venue_status: null, venue_name: null, booked_categories: [], setup_status: "skipped" });
  mocks.bookings.mockResolvedValue({ complete: true, categories: [] });
});
describe("Setup booking operations", () => {
  it.each([undefined, 0, 1000])("reuses a Marketplace relationship, price=%s, preserving omitted fields", async price => {
    mocks.results.push(tax, ok(), ok({ id: "existing" }), ok(), declaration, ok());
    expect(await bookSetupVendor({ ...booking, ...(price == null ? {} : { agreedPriceShekels: price }) })).toMatchObject({ status: "success" });
    const write = writes("couple_vendors")[0]; expect(write.op).toBe("update");
    expect(write.args[0]).toEqual({ wedding_id: "owned", vendor_id: id, status: "booked", ...(price == null ? {} : { agreed_price_minor: price * 100 }) });
    expect(writes("budget_items")).toEqual([]); expect(writes("payments")).toEqual([]);
    expect(writes("weddings")[0].args[0]).toEqual({ booked_categories: ["DJ"] });
    expect(mocks.calls.findIndex(c => c.table === "weddings")).toBeGreaterThan(mocks.calls.findIndex(c => c.table === "couple_vendors" && c.op === "update"));
  });
  it("creates a fresh Marketplace booking without inventing a price or bookmark", async () => {
    mocks.results.push(tax, ok(), ok(null), ok(), declaration, ok());
    await bookSetupVendor(booking);
    expect(writes("couple_vendors")[0]).toMatchObject({ op: "insert", args: [{ wedding_id: "owned", vendor_id: id, status: "booked", is_saved: false }] });
  });
  it("reports cleanup failure as confirmed booking needing review, never a retry", async () => {
    mocks.results.push(tax, ok(), ok({ id }), ok(), bad);
    expect(await bookSetupVendor(booking)).toMatchObject({ status: "review" });
    expect(writes("couple_vendors")).toHaveLength(1);
  });
  it("does not remove declarations after failed booking / trigger", async () => {
    mocks.results.push(tax, ok(), ok({ id }), bad);
    const reply = await bookSetupVendor(booking);
    expect(reply.status).toBe("error"); expect(reply.message).not.toContain("PRIVATE");
    expect(writes("weddings")).toEqual([]);
  });
  it.each([undefined, 0, 1250])("creates an External Vendor and shared Booked relationship without contacts, price=%s", async price => {
    mocks.results.push(tax, ok(), ok(), declaration, ok());
    expect(await bookSetupVendor({ category: "photographer", subcategory: "wedding-photographers", mode: "external", businessName: "Private Studio", ...(price == null ? {} : { agreedPriceShekels: price }) })).toMatchObject({ status: "success" });
    expect(writes("external_vendors")[0].args[0]).toEqual({ wedding_id: "owned", business_name: "Private Studio", category_id: "parent", subcategory_id: "subcategory" });
    expect(writes("couple_vendors")[0].args[0]).toMatchObject({ vendor_id: null, external_vendor_id: id, status: "booked", agreed_price_minor: price == null ? null : price * 100 });
    expect(writes("budget_items")).toEqual([]); expect(writes("payments")).toEqual([]);
  });
  it("signals uncertain External creation without automatic retry", async () => {
    mocks.results.push(tax, new Error("network"));
    expect(await bookSetupVendor({ category: "photographer", subcategory: "wedding-photographers", mode: "external", businessName: "Studio" })).toMatchObject({ status: "error", creationAttempted: true });
    expect(writes("external_vendors")).toHaveLength(1);
  });
  it.each([{ weddingId: "forged" }, { vendorId: "invalid" }, { subcategory: "djs" }, { agreedPriceShekels: -1 }])("rejects forged IDs/category/price: %j", async extra => {
    expect(await bookSetupVendor({ ...booking, ...extra })).toMatchObject({ status: "error" }); expect(mocks.calls).toEqual([]);
  });
  it("validates the actual public vendor against selected taxonomy", async () => {
    mocks.results.push(tax, bad);
    expect(await bookSetupVendor(booking)).toMatchObject({ status: "error" });
    expect(mocks.calls).toContainEqual({ table: "vendor_profiles", op: "eq", args: ["is_public", true] });
    expect(writes("couple_vendors")).toEqual([]);
  });
  it.each(["public", "vendor", "other-couple"])("requires authorized owned wedding first: %s", async () => {
    mocks.owned.mockRejectedValue(new Error("Unauthorized"));
    await expect(bookSetupVendor(booking)).rejects.toThrow("Unauthorized");
    await expect(saveBookingDeclaration({ category: "dj", operation: "add" })).rejects.toThrow("Unauthorized");
    expect(mocks.calls).toEqual([]);
  });
  it("stores only the declaration using a fresh revision", async () => {
    mocks.results.push(declaration, ok());
    expect(await saveBookingDeclaration({ category: "venue", operation: "add" })).toMatchObject({ status: "success" });
    expect(writes("weddings")[0].args[0]).toEqual({ booked_categories: ["Photographer", "DJ", "Venue"], venue_status: null });
    expect(mocks.calls).toContainEqual({ table: "weddings", op: "eq", args: ["updated_at", "latest"] });
    for (const table of ["couple_vendors", "external_vendors", "budget_items", "payments"]) expect(writes(table)).toEqual([]);
  });
  it("does not let a venue declaration/status silently cancel a real booking", async () => {
    mocks.bookings.mockResolvedValue({ complete: true, categories: [{ category: "venue", confirmedIds: [id] }] });
    expect(await saveBookingDeclaration({ category: "venue", operation: "looking" })).toMatchObject({ status: "error" }); expect(mocks.calls).toEqual([]);
  });
  it("searches bounded existing Marketplace infrastructure and returns no contacts/reviews", async () => {
    mocks.market.mockResolvedValue({ isPreview: false, total: 30, pageSize: 12, vendors: Array.from({ length: 12 }, () => ({ id, businessName: "Studio", locationCity: "City", subcategoryName: "Photo", phone: "PRIVATE", reviews: ["PRIVATE"] })) });
    const result = await searchSetupVendors({ category: "photographer", subcategory: "wedding-photographers", search: "Studio", page: 2 });
    expect(result.vendors).toHaveLength(12); expect(result.hasMore).toBe(true); expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(mocks.market).toHaveBeenCalledWith({ subcategory: "wedding-photographers", search: "Studio", page: 2 });
  });
});
describe("Setup / Details saves", () => {
  it.each([completeWeddingSetup, saveWeddingDetails])("uses consistent completion and preserves independently managed booking metadata", async action => {
    mocks.results.push(ok());
    await expect(action({ status: "idle" }, form())).rejects.toThrow("REDIRECT:");
    expect(writes("weddings")[0].args[0]).toMatchObject({ setup_status: "completed", total_budget_minor: 17000000 });
    for (const field of ["booked_categories", "venue_status", "venue_name"]) expect(writes("weddings")[0].args[0]).not.toHaveProperty(field);
    for (const path of ["/budget", "/wedding/setup", "/wedding/details", "/vendors", "/assistant"]) expect(mocks.refresh).toHaveBeenCalledWith(path);
  });
  it.each([completeWeddingSetup, saveWeddingDetails])("blocks stale whole-form overwrites and missing revision", async action => {
    const f = form(); f.set("revision", "old");
    expect(await action({ status: "idle" }, f)).toMatchObject({ status: "error", message: expect.stringContaining("changed") }); expect(writes("weddings")).toEqual([]);
  });
  it("protects against a race after the initial revision check", async () => {
    mocks.results.push(ok(null));
    expect(await saveWeddingDetails({ status: "idle" }, form())).toMatchObject({ status: "error" });
    expect(mocks.calls).toContainEqual({ table: "weddings", op: "eq", args: ["updated_at", "revision"] });
  });
  it("returns field errors without writing", async () => {
    const f = form(); f.set("guestCount", "99999");
    expect(await completeWeddingSetup({ status: "idle" }, f)).toMatchObject({ status: "error", errors: { guestCount: expect.any(Array) } }); expect(writes("weddings")).toEqual([]);
  });
  it("Skip changes only status and does not persist entered values", async () => {
    mocks.results.push(ok()); await expect(skipWeddingSetup({ status: "idle" })).rejects.toThrow("REDIRECT:/wedding");
    expect(writes("weddings")[0].args[0]).toEqual({ setup_status: "skipped" });
  });
  it("Skip failure does not redirect or refresh", async () => {
    mocks.results.push(bad); expect(await skipWeddingSetup({ status: "idle" })).toMatchObject({ status: "error" }); expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
