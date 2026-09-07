// @vitest-environment node
// Real auth/ownership functions with an isolated database double; never live data.
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: "owner" as string | null, role: "couple", calls: [] as Array<[string,string,...unknown[]]> }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => state.user ? [{ name: "sb-local-auth-token", value: "synthetic" }] : [] }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: state.user } } }) },
  from(table: string) {
    const filters: Record<string, unknown> = {}, chain: Record<string, unknown> = {};
    let mutation = false;
    for (const op of ["select", "eq", "single", "maybeSingle", "update", "delete", "insert"]) chain[op] = (...args: unknown[]) => {
      state.calls.push([table,op,...args]); if (op === "eq") filters[String(args[0])] = args[1];
      if (["update","delete","insert"].includes(op)) mutation = true;
      return chain;
    };
    chain.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ error: null, data:
      table === "profiles" ? { id: state.user, role: state.role, display_name: "Synthetic", avatar_choice: "heart", avatar_storage_path: null } :
      table === "weddings" && filters.owner_user_id === state.user ? { id: "owned-wedding", booked_categories: [], updated_at: "revision" } :
      table === "vendor_profiles" && filters.owner_user_id === state.user && !mutation ? { id: "11111111-1111-4111-8111-111111111111", slug: "own", vendor_images: [] } : null }).then(resolve);
    return chain;
  },
}) }));
import { saveGuest, deleteGuest } from "@/lib/actions/guests";
import { saveBudgetItem, savePayment, deletePayment, togglePaymentPaid, setTotalBudget } from "@/lib/actions/budget";
import { setVendorStatus, setRelationshipSaved, saveExternalVendor, deleteExternalVendor } from "@/lib/actions/vendors";
import { bookSetupVendor, saveBookingDeclaration } from "@/lib/actions/setup-bookings";
import { saveWeddingDetails, completeWeddingSetup, skipWeddingSetup } from "@/lib/actions/wedding";
import { chooseCoupleAvatar, saveCouplePhoto, removeCouplePhoto } from "@/lib/actions/couple-identity";
import { saveVendorProfile, registerVendorImage, deleteVendorImage } from "@/lib/actions/vendor-profile";
const idle = { status: "idle" as const }, foreign = "22222222-2222-4222-8222-222222222222";
const form = (values: Record<string,string> = {}) => { const f = new FormData(); Object.entries({ wedding_id: "foreign-wedding", owner_user_id: "foreign-owner", ...values }).forEach(([k,v]) => f.set(k,v)); return f; };
const guest = () => form({ id: foreign, fullName: "Synthetic", invitedCount: "1", rsvpStatus: "not_invited" });
const external = () => form({ externalVendorId: foreign, relationshipId: foreign, businessName: "Synthetic", lifecycleStatus: "booked" });
const payment = () => form({ id: foreign, budgetItemId: foreign, label: "Payment", amountShekels: "1", dueDate: "", notes: "" });
beforeEach(() => { state.user = "owner"; state.role = "couple"; state.calls.length = 0; });
const coupleActions = [
  ["guest save", () => saveGuest(idle, guest())], ["guest delete", () => deleteGuest(guest())],
  ["budget edit", () => saveBudgetItem(idle, form({ id: foreign }))], ["total", () => setTotalBudget(idle, form({ totalBudgetShekels: "100" }))],
  ["payment save", () => savePayment(idle, payment())], ["payment delete", () => deletePayment(payment())], ["payment paid", () => togglePaymentPaid(payment())],
  ["vendor status", () => setVendorStatus(form({ vendorId: foreign, status: "booked" }))],
  ["saved", () => setRelationshipSaved(form({ relationshipId: foreign, isSaved: "true" }))],
  ["external save", () => saveExternalVendor(idle, external())], ["external delete", () => deleteExternalVendor(external())],
  ["setup booking", () => bookSetupVendor({})], ["declaration", () => saveBookingDeclaration({})],
  ["details", () => saveWeddingDetails(idle, form())], ["setup", () => completeWeddingSetup(idle, form())], ["skip", () => skipWeddingSetup(idle)],
  ["avatar", () => chooseCoupleAvatar("heart")], ["photo", () => saveCouplePhoto(`${foreign}/avatar.jpg`)], ["remove photo", () => removeCouplePhoto()],
] as const;
it.each(coupleActions)("%s denies Vendor and anonymous via real server authorization", async (_, action) => {
  state.user = null; await expect(action()).rejects.toThrow("REDIRECT:/auth/couple");
  state.user = "owner"; state.role = "vendor"; await expect(action()).rejects.toThrow("REDIRECT:/vendor");
  expect(state.calls.filter(c => c[0] !== "profiles")).toEqual([]);
});
it.each([
  ["guest", () => saveGuest(idle, guest()), "guests"],
  ["expense", () => saveBudgetItem(idle, form({ id: foreign })), "budget_items"],
  ["payment", () => savePayment(idle, payment()), "budget_items"],
  ["external", () => saveExternalVendor(idle, external()), "couple_vendors"],
] as const)("forged %s IDs fail without leaking existence and resolve owned wedding", async (_, action, table) => {
  const result = await action(); expect(result.status).toBe("error");
  expect(state.calls).toContainEqual(["weddings","eq","owner_user_id","owner"]);
  expect(state.calls).toContainEqual([table,"eq","wedding_id","owned-wedding"]);
  expect(state.calls.filter(c => ["insert","delete"].includes(c[1]))).toEqual([]);
});
it("rejects another Couple's photo path before storage access", async () => {
  expect((await saveCouplePhoto(`${foreign}/avatar-11111111-1111-4111-8111-111111111111.jpg`)).status).toBe("error");
  expect(state.calls.filter(c => c[1] === "update")).toEqual([]);
});
it.each([
  ["profile", () => saveVendorProfile(idle, form({ businessName: "Own business" }))],
  ["image add", () => registerVendorImage(foreign, `${foreign}/x.jpg`, "Photo")],
  ["image delete", () => deleteVendorImage(form({ imageId: foreign }))],
] as const)("Vendor %s denies Couple and anonymous", async (_, action) => {
  await expect(action()).rejects.toThrow("REDIRECT:/wedding");
  state.user = null; await expect(action()).rejects.toThrow("REDIRECT:/auth/vendor");
  expect(state.calls.filter(c => c[0] !== "profiles")).toEqual([]);
});
it("Vendor profile ignores supplied owner/profile IDs and scopes edits to its actual owner", async () => {
  state.role = "vendor";
  await saveVendorProfile(idle, form({ businessName: "Own business", id: foreign }));
  expect(state.calls).toContainEqual(["vendor_profiles","eq","owner_user_id","owner"]);
  expect(state.calls).toContainEqual(["vendor_profiles","eq","id","11111111-1111-4111-8111-111111111111"]);
  const values = state.calls.find(c => c[1] === "update")?.[2];
  expect(values).not.toHaveProperty("owner_user_id"); expect(values).not.toHaveProperty("id");
});
it("Vendor cannot register another business's image namespace", async () => {
  state.role = "vendor";
  await expect(registerVendorImage(foreign, `${foreign}/x.jpg`, "Photo")).rejects.toThrow("Invalid image path");
  await expect(registerVendorImage("11111111-1111-4111-8111-111111111111", `${foreign}/x.jpg`, "Photo")).rejects.toThrow("Invalid image path");
  expect(state.calls.filter(c => c[1] === "insert")).toEqual([]);
});
