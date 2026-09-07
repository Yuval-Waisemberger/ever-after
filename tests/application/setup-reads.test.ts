// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ role: vi.fn(), result: { data: [] as unknown, error: null as unknown }, calls: [] as Array<{ op: string; args: unknown[] }> }));
vi.mock("@/lib/auth/user", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => {
  const chain: Record<string, unknown> = {};
  for (const op of ["select", "eq", "order", "limit", "single"]) chain[op] = (...args: unknown[]) => { mocks.calls.push({ op, args }); return chain; };
  chain.then = (resolve: (x: unknown) => unknown) => Promise.resolve(mocks.result).then(resolve);
  return chain;
} }) }));
import { createClient } from "@/lib/supabase/server";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { readBookingRelationships } from "@/lib/queries/booking-relationships";
const row = { id: "owned-relationship", status: "booked", vendor_profiles: { business_name: "Studio", vendor_categories: { slug: "photography-content" }, vendor_subcategories: { slug: "wedding-photographers" }, phone: "PRIVATE" }, external_vendors: null, private_notes: "PRIVATE" };
beforeEach(() => { vi.clearAllMocks(); mocks.calls.length = 0; mocks.role.mockResolvedValue({ id: "authenticated-couple" }); mocks.result = { data: [], error: null }; });
describe("owned Setup reads", () => {
  it("requires Couple role and explicitly scopes wedding to authenticated owner", async () => {
    mocks.result.data = { id: "owned-wedding" };
    await getOwnedWedding();
    expect(mocks.role).toHaveBeenCalledWith("couple");
    expect(mocks.calls).toContainEqual({ op: "eq", args: ["owner_user_id", "authenticated-couple"] });
  });
  it.each(["vendor", "public"])("denies %s before querying", async () => {
    mocks.role.mockRejectedValue(new Error("Denied")); await expect(getOwnedWedding()).rejects.toThrow("Denied"); expect(mocks.calls).toEqual([]);
  });
  it("returns safe planning identities only with owned-wedding filter", async () => {
    mocks.result.data = [row];
    const result = await readBookingRelationships(await createClient(), "owned-wedding");
    expect(result.complete).toBe(true); expect(result.relationships[0].businessName).toBe("Studio");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(mocks.calls).toContainEqual({ op: "eq", args: ["wedding_id", "owned-wedding"] });
  });
  it.each(["failure", "null", "cap", "broken-reference"])("keeps %s unavailable, never a factual empty booking set", async mode => {
    mocks.result = mode === "failure" ? { data: [], error: { message: "PRIVATE" } }
      : { data: mode === "null" ? null : mode === "cap" ? Array.from({ length: 201 }, () => row) : [{ ...row, vendor_profiles: null }], error: null };
    expect((await readBookingRelationships(await createClient(), "owned")).complete).toBe(false);
  });
});
