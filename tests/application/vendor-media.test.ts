// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ profile: vi.fn(), from: vi.fn(), download: vi.fn(), remove: vi.fn(), refresh: vi.fn(), result: { data: { id: "vendor" } as { id: string } | null, error: null as object | null } }));
vi.mock("next/cache", () => ({ revalidatePath: m.refresh }));
vi.mock("@/lib/queries/vendor-dashboard", () => ({ getOwnedVendorProfile: m.profile }));
vi.mock("@/lib/auth/user", () => ({ requireRole: vi.fn(async () => ({id: "owner"})) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: m.from, storage: { from: () => ({ download: m.download, remove: m.remove }) } }) }));
import { saveVendorProfileImage, removeVendorProfileImage } from "@/lib/actions/vendor-identity";
import { registerVendorImage, saveVendorProfile } from "@/lib/actions/vendor-profile";
import { vendorImageError, isVendorImagePath, orderedVendorImages } from "@/lib/domain/vendor-media";

let images: Array<{ id: string; storage_path: string; sort_order: number }>;
let update: ReturnType<typeof vi.fn>;
let insert: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks(); images = [];
  m.result = { data: { id: "vendor" }, error: null };
  m.profile.mockImplementation(async () => ({ id: "vendor", profile_image_storage_path: "vendor/profile/old.jpg", vendor_images: [...images] }));
  m.download.mockResolvedValue({ data: new Blob(["test"], { type: "image/jpeg" }), error: null });
  m.remove.mockResolvedValue({ error: null });
  const chain = { eq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(async () => m.result), then: (resolve: (value: typeof m.result) => void) => resolve(m.result) };
  chain.eq.mockReturnValue(chain); chain.is.mockReturnValue(chain); chain.select.mockReturnValue(chain);
  update = vi.fn(() => chain);
  insert = vi.fn(async (data) => { images.push({ id: data.storage_path, ...data }); return { error: null }; });
  m.from.mockReturnValue({ update, insert });
});

describe("Separate Vendor identity", () => {
  it("publishes and unpublishes the canonical row and invalidates public detail/discovery without inserting", async () => {
    m.profile.mockResolvedValue({id:"vendor",slug:"stable-slug"});
    for (const isPublic of [true, false]) {
      const data = new FormData(); data.set("businessName", "Changed name");
      if (isPublic) data.set("isPublic", "on");
      expect((await saveVendorProfile({status:"idle"},data)).status).toBe("success");
      expect(update).toHaveBeenLastCalledWith(expect.objectContaining({is_public:isPublic}));
      expect(m.refresh).toHaveBeenCalledWith("/vendors/stable-slug");
      expect(m.refresh).toHaveBeenCalledWith("/vendors");
      expect(m.refresh).toHaveBeenCalledWith("/(vendor)","layout");
    }
    expect(insert).not.toHaveBeenCalled();
  });
  it("revalidates the Vendor layout only after a successful canonical business-name save", async () => {
    const data = new FormData(); data.set("businessName", "Updated Studio");
    expect((await saveVendorProfile({status:"idle"}, data)).status).toBe("success");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({business_name: "Updated Studio"}));
    expect(m.refresh).toHaveBeenCalledWith("/(vendor)", "layout");
    m.refresh.mockClear(); m.result = {data:null,error:{}};
    expect((await saveVendorProfile({status:"idle"}, data)).status).toBe("error");
    expect(m.refresh).not.toHaveBeenCalled();
  });
  it("saves only the identity field, then removes the old identity object", async () => {
    expect((await saveVendorProfileImage("vendor/profile/new.jpg")).status).toBe("success");
    expect(update).toHaveBeenCalledWith({ profile_image_storage_path: "vendor/profile/new.jpg" });
    expect(m.from).toHaveBeenCalledWith("vendor_profiles"); expect(insert).not.toHaveBeenCalled();
    expect(m.remove).toHaveBeenCalledWith(["vendor/profile/old.jpg"]);
    expect(m.remove.mock.invocationCallOrder[0]).toBeGreaterThan(update.mock.invocationCallOrder[0]);
    expect(m.refresh).toHaveBeenCalledWith("/(vendor)", "layout");
  });
  it("retains the old value on save failure and cleans only the new object", async () => {
    m.result = { data: null, error: {} };
    expect((await saveVendorProfileImage("vendor/profile/new.jpg")).status).toBe("error");
    expect(m.remove).toHaveBeenCalledExactlyOnceWith(["vendor/profile/new.jpg"]);
    expect(m.refresh).not.toHaveBeenCalled();
  });
  it("does not clean a new object already saved by a concurrent identical retry", async () => {
    m.result = { data: null, error: null };
    m.profile.mockResolvedValueOnce({ id: "vendor", profile_image_storage_path: null }).mockResolvedValue({ id: "vendor", profile_image_storage_path: "vendor/profile/new.jpg" });
    await saveVendorProfileImage("vendor/profile/new.jpg"); expect(m.remove).not.toHaveBeenCalled();
  });
  it("clears the field before removing the old image and preserves gallery", async () => {
    await removeVendorProfileImage(); expect(update).toHaveBeenCalledWith({ profile_image_storage_path: null });
    expect(m.remove).toHaveBeenCalledWith(["vendor/profile/old.jpg"]); expect(insert).not.toHaveBeenCalled();
  });
  it("does not delete anything when removal fails", async () => {
    m.result = { data: null, error: {} }; expect((await removeVendorProfileImage()).status).toBe("error"); expect(m.remove).not.toHaveBeenCalled();
  });
  it("rejects gallery paths, another owner and unsupported file metadata", async () => {
    for (const path of ["other/profile/new.jpg", "vendor/new.jpg", "vendor/profile/../new.jpg"]) expect((await saveVendorProfileImage(path)).status).toBe("error");
    expect(update).not.toHaveBeenCalled();
    m.download.mockResolvedValue({ data: new Blob(["bad"], { type: "text/html" }), error: null });
    expect((await saveVendorProfileImage("vendor/profile/new.jpg")).status).toBe("error"); expect(update).not.toHaveBeenCalled();
  });
  it("keeps successful save successful if old-object cleanup fails", async () => {
    m.remove.mockRejectedValue(new Error("offline")); expect((await saveVendorProfileImage("vendor/profile/new.jpg")).status).toBe("success");
  });
});
describe("Gallery limit and derived view", () => {
  it("accepts below three, rejects the next request, and never writes identity", async () => {
    for (let i=0; i<3; i++) await registerVendorImage("vendor", `vendor/${i}.jpg`, "work");
    await expect(registerVendorImage("vendor", "vendor/4.jpg", "work")).rejects.toThrow("maximum of 3");
    expect(insert).toHaveBeenCalledTimes(3); expect(update).not.toHaveBeenCalled();
  });
  it("serializes concurrent registrations and makes repeated paths idempotent", async () => {
    const results = await Promise.allSettled([0,1,2,3].map(i => registerVendorImage("vendor", `vendor/${i}.jpg`, "")));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(3);
    await registerVendorImage("vendor", "vendor/0.jpg", ""); expect(insert).toHaveBeenCalledTimes(3);
  });
  it("rejects identity paths without touching either stored image type", async () => {
    await expect(registerVendorImage("vendor", "vendor/profile/new.jpg", "")).rejects.toThrow(); expect(insert).not.toHaveBeenCalled();
  });
  it("validates file size/type and retains original image order input", () => {
    expect(vendorImageError({ size: 5242881, type: "image/jpeg" })).toContain("5 MB");
    expect(vendorImageError({ size: 5242880, type: "image/webp" })).toBeNull();
    expect(isVendorImagePath("vendor/profile/a.png", "vendor", true)).toBe(true);
    const source = [{id:"b",sort_order:2},{id:"a",sort_order:0}]; expect(orderedVendorImages(source)[0].id).toBe("a"); expect(source[0].id).toBe("b");
  });
});
