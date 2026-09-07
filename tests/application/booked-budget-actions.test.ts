// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  results: [] as unknown[], calls: [] as Array<{ table: string; op: string; args: unknown[] }>,
  owned: vi.fn(), refresh: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/queries/wedding", () => ({ getOwnedWedding: mocks.owned }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from(table: string) {
  const chain: Record<string, unknown> = {};
  for (const op of ["select", "insert", "update", "upsert", "delete", "eq", "order", "limit", "single", "maybeSingle"]) {
    chain[op] = (...args: unknown[]) => { mocks.calls.push({ table, op, args }); return chain; };
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mocks.results.shift()).then(resolve);
  return chain;
} }) }));

import { setVendorStatus, saveExternalVendor, deleteExternalVendor, setMarketplaceVendorSaved } from "@/lib/actions/vendors";
import { saveBudgetItem, savePayment, deleteBudgetItem } from "@/lib/actions/budget";
const id = "11111111-1111-4111-8111-111111111111";
const wedding = "22222222-2222-4222-8222-222222222222";
const ok = (data: unknown = { id }) => ({ data, error: null });
const bad = { data: null, error: { message: "PRIVATE DATABASE ERROR", code: "23514" } };
const form = (values: Record<string, string>) => { const f = new FormData(); for (const [k,v] of Object.entries(values)) f.set(k,v); return f; };
const vendor = (overrides: Record<string, string> = {}) => form({ vendorId: id, status: "booked", agreedPriceShekels: "1000", privateNotes: "", returnTo: "/vendors/my", detailsMode: "true", ...overrides });
const expense = (overrides: Record<string, string> = {}) => form({ label: "Expense", category: "", estimatedShekels: "1500", notes: "", ...overrides });
const payment = (overrides: Record<string, string> = {}) => form({ budgetItemId: id, label: "Deposit", amountShekels: "10", dueDate: "", notes: "", ...overrides });
const writes = (table: string) => mocks.calls.filter(c => c.table === table && ["insert", "upsert", "update", "delete"].includes(c.op));

beforeEach(() => {
  vi.clearAllMocks(); mocks.results.length = 0; mocks.calls.length = 0;
  mocks.owned.mockResolvedValue({ id: wedding });
  mocks.redirect.mockImplementation((url: string) => { throw new Error(`REDIRECT:${url}`); });
});

describe("relationship writes delegate financial synchronization to PostgreSQL", () => {
  it.each([
    ["booked", "1000"], ["booked", ""], ["booked", "1200"], ["booked", "0"], ["considering", "1000"], ["rejected", "1000"],
  ])("saves status %s / price %s without a Budget or payment writer", async (status, price) => {
    mocks.results.push(ok({ id, is_saved: true }), ok());
    await expect(setVendorStatus(vendor({ status, agreedPriceShekels: price }))).rejects.toThrow("relationship=updated");
    expect(writes("budget_items")).toEqual([]); expect(writes("payments")).toEqual([]);
    expect(writes("couple_vendors")).toHaveLength(1);
    expect(writes("couple_vendors")[0].args[0]).toMatchObject({ status, agreed_price_minor: price === "" ? null : Number(price) * 100, wedding_id: wedding });
    expect(writes("couple_vendors")[0].args[0]).not.toHaveProperty("is_saved");
  });
  it("quick booking preserves price and bookmark, and uses the same relationship path", async () => {
    mocks.results.push(ok({ id }), ok());
    await expect(setVendorStatus(vendor({ detailsMode: "false" }))).rejects.toThrow("relationship=updated");
    const values = writes("couple_vendors")[0].args[0];
    expect(values).not.toHaveProperty("agreed_price_minor"); expect(values).not.toHaveProperty("is_saved");
    expect(writes("budget_items")).toEqual([]);
  });
  it("repeated saves, unbook and rebook never introduce another application writer", async () => {
    for (const status of ["booked", "booked", "considering", "booked"]) {
      mocks.results.push(ok({ id }), ok());
      await expect(setVendorStatus(vendor({ status }))).rejects.toThrow("relationship=updated");
    }
    expect(writes("couple_vendors")).toHaveLength(4); expect(writes("budget_items")).toHaveLength(0);
  });
  it("creates a new relationship using only server-owned wedding identity", async () => {
    mocks.results.push(ok(null), ok());
    await expect(setVendorStatus(vendor({ wedding_id: id }))).rejects.toThrow("relationship=updated");
    expect(writes("couple_vendors")[0]).toMatchObject({ op: "insert", args: [expect.objectContaining({ wedding_id: wedding, is_saved: false })] });
  });
  it.each([bad, ok(null)])("does not report success when the mutation/trigger fails or affects no row", async result => {
    mocks.results.push(ok({ id }), result);
    await expect(setVendorStatus(vendor())).rejects.toThrow("relationship=error");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("does not interpret a failed relationship read as a missing row", async () => {
    mocks.results.push(bad);
    await expect(setVendorStatus(vendor())).rejects.toThrow("relationship=error");
    expect(writes("couple_vendors")).toHaveLength(0);
  });
  it("fails closed on a bookmark cleanup history read", async () => {
    mocks.results.push(ok({ id, status: "saved", agreed_price_minor: null }), { count: null, error: bad.error });
    await expect(setMarketplaceVendorSaved(form({ vendorId: id, isSaved: "false", returnTo: "/vendors/my" }))).rejects.toThrow("relationship=error");
    expect(writes("couple_vendors")).toHaveLength(0);
  });
  it("surfaces External Vendor deletion protection safely", async () => {
    mocks.results.push(bad);
    await expect(deleteExternalVendor(form({ externalVendorId: id }))).rejects.toThrow("relationship=financial-history");
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.calls).toContainEqual({ table: "external_vendors", op: "eq", args: ["wedding_id", wedding] });
  });
  it("External Vendor booking has one relationship writer and reports sync failure", async () => {
    const values = form({ externalVendorId: id, relationshipId: id, businessName: "External Studio", categoryId: "", subcategoryId: "", contactName: "", phone: "", email: "", websiteUrl: "", notes: "", lifecycleStatus: "booked", agreedPriceShekels: "1000" });
    mocks.results.push(ok({ id }), ok(), bad);
    const result = await saveExternalVendor({ status: "idle" }, values);
    expect(result).toMatchObject({ status: "error" }); expect(result.message).not.toContain("PRIVATE");
    expect(writes("budget_items")).toHaveLength(0); expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it.each(["", "0", "1000", "1200"])("saves External Vendor price %s using the shared relationship trigger", async price => {
    mocks.results.push(ok({ id }), ok(), ok());
    const values = form({ externalVendorId: id, relationshipId: id, businessName: "External Studio", categoryId: "", subcategoryId: "", contactName: "", phone: "", email: "", websiteUrl: "", notes: "", lifecycleStatus: "booked", agreedPriceShekels: price });
    expect(await saveExternalVendor({ status: "idle" }, values)).toMatchObject({ status: "success" });
    expect(writes("couple_vendors")[0].args[0]).toMatchObject({ status: "booked", agreed_price_minor: price === "" ? null : Number(price) * 100 });
    expect(writes("budget_items")).toHaveLength(0); expect(writes("payments")).toHaveLength(0);
  });
});

describe("Budget/payment boundaries", () => {
  it.each(["coupleVendorId", "committedShekels", "source"])("rejects forged canonical field %s", async key => {
    mocks.results.push(ok({ id, source: "booked_vendor", committed_amount_minor: 100_000 }));
    expect(await saveBudgetItem({ status: "idle" }, expense({ id, [key]: "" }))).toMatchObject({ status: "error" });
    expect(writes("budget_items")).toHaveLength(0);
  });
  it("allows canonical metadata/estimate edits without sending owned fields", async () => {
    mocks.results.push(ok({ id, source: "booked_vendor", committed_amount_minor: null }), ok());
    expect(await saveBudgetItem({ status: "idle" }, expense({ id }))).toMatchObject({ status: "success" });
    const values = writes("budget_items")[0].args[0];
    for (const key of ["couple_vendor_id", "source", "committed_amount_minor"]) expect(values).not.toHaveProperty(key);
    expect(values).toHaveProperty("estimated_amount_minor", 150_000);
  });
  it("blocks manual linking and fails closed on missing/forged expense IDs", async () => {
    expect(await saveBudgetItem({ status: "idle" }, expense({ coupleVendorId: id }))).toMatchObject({ status: "error" });
    mocks.results.push(bad);
    expect(await saveBudgetItem({ status: "idle" }, expense({ id }))).toMatchObject({ status: "error" });
    expect(writes("budget_items")).toHaveLength(0);
  });
  it("does not delete a canonical item or its payments", async () => {
    mocks.results.push(ok({ source: "booked_vendor", payments: [] }));
    await expect(deleteBudgetItem(form({ id }))).rejects.toThrow("error=history");
    expect(writes("budget_items")).toHaveLength(0); expect(writes("payments")).toHaveLength(0);
  });
  it("never interprets unavailable payment reads as an empty schedule", async () => {
    mocks.results.push(ok({ committed_amount_minor: 100_000 }), bad);
    const result = await savePayment({ status: "idle" }, payment());
    expect(result.status).toBe("error"); expect(result.message).not.toContain("PRIVATE"); expect(writes("payments")).toHaveLength(0);
  });
  it("lets the database reject a schedule race without success or refresh", async () => {
    mocks.results.push(ok({ committed_amount_minor: 100_000 }), ok([]), bad);
    expect(await savePayment({ status: "idle" }, payment())).toMatchObject({ status: "error" });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("preserves historical paid timestamp and allows annotations after unbooking", async () => {
    mocks.results.push(ok({ committed_amount_minor: null }), ok([{ id, amount_minor: 1000, is_paid: true, paid_at: "2026-09-01T00:00:00Z" }]), ok());
    expect(await savePayment({ status: "idle" }, payment({ id, isPaid: "on" }))).toMatchObject({ status: "success" });
    expect(writes("payments")[0].args[0]).toMatchObject({ paid_at: "2026-09-01T00:00:00Z", amount_minor: 1000 });
  });
  it("rejects payment creation without commitment and aggregate overscheduling", async () => {
    mocks.results.push(ok({ committed_amount_minor: null }), ok([]));
    expect(await savePayment({ status: "idle" }, payment())).toMatchObject({ status: "error" });
    mocks.results.push(ok({ committed_amount_minor: 1000 }), ok([{ id: "other", amount_minor: 600 }]));
    expect(await savePayment({ status: "idle" }, payment({ amountShekels: "5" }))).toMatchObject({ status: "error" });
    expect(writes("payments")).toHaveLength(0);
  });
  it("requires Couple authorization before any financial write", async () => {
    mocks.owned.mockRejectedValue(new Error("Unauthorized"));
    await expect(savePayment({ status: "idle" }, payment())).rejects.toThrow("Unauthorized");
    await expect(setVendorStatus(vendor())).rejects.toThrow("Unauthorized");
    expect(mocks.calls).toHaveLength(0);
  });
});
