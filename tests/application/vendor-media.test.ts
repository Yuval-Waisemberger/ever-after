// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ profile: vi.fn(), from: vi.fn(), download: vi.fn(), remove: vi.fn(), refresh: vi.fn(), result: { data: { id: "vendor" } as { id: string } | null, error: null as object | null } }));
vi.mock("next/cache", () => ({ revalidatePath: m.refresh }));
vi.mock("@/lib/queries/vendor-dashboard", () => ({ getOwnedVendorProfile: m.profile }));
vi.mock("@/lib/auth/user", () => ({ requireRole: vi.fn(async () => ({id: "owner"})) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: m.from, storage: { from: () => ({ download: m.download, remove: m.remove }) } }) }));
import { saveVendorProfileImage, removeVendorProfileImage } from "@/lib/actions/vendor-identity";
import { deleteVendorImage, registerVendorImage, saveVendorProfile } from "@/lib/actions/vendor-profile";
import { vendorImageError, isVendorImagePath, orderedVendorImages } from "@/lib/domain/vendor-media";

let images: Array<{ id: string; storage_path: string; sort_order: number }>;
let update: ReturnType<typeof vi.fn>;
let insert: ReturnType<typeof vi.fn>;
let deleteRow: ReturnType<typeof vi.fn>;
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
  deleteRow = vi.fn(() => chain);
  m.from.mockReturnValue({ update, insert, delete: deleteRow });
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
  it("does not report success when the owned profile update matches no row", async () => {
    const data = new FormData(); data.set("businessName", "Updated Studio");
    m.result = { data: null, error: null };

    await expect(saveVendorProfile({status:"idle"}, data)).resolves.toEqual({
      status: "error",
      message: "The business profile could not be saved.",
    });
    expect(m.refresh).not.toHaveBeenCalled();
  });
  it("performs no profile write when validation rejects the submitted values", async () => {
    const data = new FormData();
    data.set("businessName", "Updated Studio");
    data.set("minPriceShekels", "9000");
    data.set("maxPriceShekels", "7000");

    expect((await saveVendorProfile({status:"idle"}, data)).status).toBe("error");
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(m.refresh).not.toHaveBeenCalled();
  });
  it("preserves the required account identity while saving an otherwise sparse profile", async () => {
    m.profile.mockResolvedValue({ id: "vendor", slug: "stable-slug", business_name: "Signup Studio" });
    const data = new FormData();
    data.set("businessName", "");
    data.set("description", "One saved detail");

    await expect(saveVendorProfile({ status: "idle" }, data)).resolves.toMatchObject({ status: "success" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      business_name: "Signup Studio",
      description: "One saved detail",
      contact_name: null,
      category_id: null,
      service_areas: [],
      styles: [],
      event_types: [],
      min_guest_capacity: null,
    }));
  });
  it("requires the technical business identity only when no Vendor profile exists", async () => {
    m.profile.mockResolvedValue(null);
    const data = new FormData();
    data.set("businessName", "");
    data.set("description", "Cannot create without an identity");

    await expect(saveVendorProfile({ status: "idle" }, data)).resolves.toEqual({
      status: "error",
      errors: { businessName: ["Enter the business name used for this Vendor account"] },
    });
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
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
  it("reports gallery removal only after Storage and the owned metadata row are removed", async () => {
    images = [{ id: "gallery-image", storage_path: "vendor/gallery.jpg", sort_order: 0 }];
    const data = new FormData(); data.set("imageId", "gallery-image");

    await expect(deleteVendorImage(data)).resolves.toEqual({ status: "success", message: "Image removed." });
    expect(m.remove).toHaveBeenCalledExactlyOnceWith(["vendor/gallery.jpg"]);
    expect(deleteRow).toHaveBeenCalledOnce();
    expect(m.refresh).toHaveBeenCalledWith("/vendor/profile");
  });
  it("settles with a controlled error and no metadata write when Storage removal fails", async () => {
    images = [{ id: "gallery-image", storage_path: "vendor/gallery.jpg", sort_order: 0 }];
    m.remove.mockResolvedValue({ error: { message: "offline" } });
    const data = new FormData(); data.set("imageId", "gallery-image");

    await expect(deleteVendorImage(data)).resolves.toEqual({ status: "error", message: "The image could not be removed." });
    expect(deleteRow).not.toHaveBeenCalled();
    expect(m.refresh).not.toHaveBeenCalled();
  });
  it("does not report success when no owned gallery metadata row is deleted", async () => {
    images = [{ id: "gallery-image", storage_path: "vendor/gallery.jpg", sort_order: 0 }];
    m.result = { data: null, error: null };
    const data = new FormData(); data.set("imageId", "gallery-image");

    await expect(deleteVendorImage(data)).resolves.toEqual({ status: "error", message: "The image could not be removed." });
    expect(m.refresh).not.toHaveBeenCalled();
  });
});
