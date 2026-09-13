// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ role: vi.fn(), result: { data: [] as unknown, error: null as unknown }, rejected: null as Error | null, publicRows: [] as unknown[], calls: [] as Array<{ table: string; op: string; args: unknown[] }> }));
vi.mock("@/lib/auth/user", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: (table: string) => {
  const chain: Record<string, unknown> = {};
  for (const op of ["select", "eq", "in", "order", "limit", "single", "maybeSingle"]) chain[op] = (...args: unknown[]) => { mocks.calls.push({ table, op, args }); return chain; };
  chain.then = (resolve: (x: unknown) => unknown, reject: (x: unknown) => unknown) => (mocks.rejected
    ? Promise.reject(mocks.rejected)
    : Promise.resolve(table === "public_vendor_profiles" ? { data: mocks.publicRows, error: null } : mocks.result)).then(resolve, reject);
  return chain;
} }) }));
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { readBookingRelationships } from "@/lib/queries/booking-relationships";
const row = { id: "owned-relationship", status: "booked", vendor_id: "vendor", external_vendors: null };
const publicVendor = { id: "vendor", slug: "studio", business_name: "Studio", description: null, category_slug: "photography-content", category_name: "Photography", subcategory_slug: "wedding-photographers", subcategory_name: "Photographers", location_city: null, location_mode: "mobile", physical_area: null, service_areas: [], min_price_minor: null, max_price_minor: null, services: [], styles: [], event_types: [], min_guest_capacity: null, max_guest_capacity: null, friday_available: null, phone: null, email: null, website_url: null, instagram_url: null };
beforeEach(() => { vi.clearAllMocks(); mocks.calls.length = 0; mocks.rejected = null; mocks.publicRows = [publicVendor]; mocks.role.mockResolvedValue({ id: "authenticated-couple" }); mocks.result = { data: [], error: null }; });
describe("owned Setup reads", () => {
  it("requires Couple role and explicitly scopes wedding to authenticated owner", async () => {
    mocks.result.data = { id: "owned-wedding" };
    await getOwnedWedding();
    expect(mocks.role).toHaveBeenCalledWith("couple");
    expect(mocks.calls).toContainEqual({ table: "weddings", op: "eq", args: ["owner_user_id", "authenticated-couple"] });
  });
  it.each(["vendor", "public"])("denies %s before querying", async () => {
    mocks.role.mockRejectedValue(new Error("Denied")); await expect(getOwnedWedding()).rejects.toThrow("Denied"); expect(mocks.calls).toEqual([]);
  });
  it("distinguishes an owned-wedding query failure from a genuinely missing wedding", async () => {
    mocks.result = { data: null, error: { message: "PRIVATE" } };
    await expect(getOwnedWedding()).rejects.toMatchObject({ code: "owned_wedding_unavailable", retryable: true });
    mocks.rejected = new Error("private network detail");
    await expect(getOwnedWedding()).rejects.toMatchObject({ code: "owned_wedding_unavailable", retryable: true });
    mocks.rejected = null;
    mocks.result = { data: null, error: null };
    await expect(getOwnedWedding()).rejects.toMatchObject({ code: "owned_wedding_missing", retryable: false });
  });
  it("returns safe planning identities only with owned-wedding filter", async () => {
    mocks.result.data = [row];
    const result = await readBookingRelationships(await createClient(), "owned-wedding");
    expect(result.complete).toBe(true); expect(result.relationships[0].businessName).toBe("Studio");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(mocks.calls).toContainEqual({ table: "couple_vendors", op: "eq", args: ["wedding_id", "owned-wedding"] });
  });
  it.each(["failure", "null", "cap", "broken-reference"])("keeps %s unavailable, never a factual empty booking set", async mode => {
    mocks.result = mode === "failure" ? { data: [], error: { message: "PRIVATE" } }
      : { data: mode === "null" ? null : mode === "cap" ? Array.from({ length: 201 }, () => row) : [row], error: null };
    if (mode === "broken-reference") mocks.publicRows = [];
    expect((await readBookingRelationships(await createClient(), "owned")).complete).toBe(false);
  });
});
