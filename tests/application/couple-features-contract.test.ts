import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const identityActions = read("src/lib/actions/couple-identity.ts");
const identityQuery = read("src/lib/queries/couple-identity.ts");
const identitySettings = read("src/components/couple/couple-avatar-settings.tsx");
const profileMenu = read("src/components/couple/couple-profile-menu.tsx");
const vendorActions = read("src/lib/actions/vendors.ts");
const vendorQueries = read("src/lib/queries/couple-vendors.ts");
const marketplaceQuery = read("src/lib/queries/vendors.ts");
const weddingPage = read("src/app/(couple)/wedding/page.tsx");
const ourVendorsPage = read("src/app/(couple)/vendors/my/page.tsx");
const shell = read("src/components/layout/app-shell.tsx");

describe("050001 application contracts", () => {
  it("retrieves private Couple media with a signed URL and keeps only the path in profiles", () => {
    expect(identityQuery).toContain('.from("couple-media")');
    expect(identityQuery).toContain("createSignedUrl(profile.avatarStoragePath");
    expect(identityActions).toContain("avatar_storage_path: storagePath");
    expect(identityActions).not.toContain("signedUrl");
    expect(identityActions).toContain('.remove([path])');
  });

  it("uses the same identity component in Our Wedding and the workspace shell", () => {
    expect(weddingPage).toContain("<CoupleProfileMenu choice={identity.avatarChoice}");
    expect(shell.match(/<CoupleAvatar/g)?.length).toBe(2);
    expect(shell).toContain("avatarPhotoUrl");
  });

  it("keeps profile editing in the anchored Settings section without technical UI copy", () => {
    expect(profileMenu).toContain('href="/settings#couple-profile"');
    expect(profileMenu).toContain('aria-label="Change couple profile"');
    expect(identitySettings).toContain('id="couple-profile"');
    expect(identitySettings).toContain("aria-label={`Choose ${COUPLE_AVATAR_LABELS[avatarChoice]} couple icon`}");
    expect(identitySettings).not.toContain("<span>{COUPLE_AVATAR_LABELS[avatarChoice]}</span>");
    for (const copy of [
      "Choosing an icon switches away from—and safely removes—the current photo.",
      "A photo is always optional; the selected icon remains the load-error fallback.",
      "Your choice appears in the sidebar and at the top of Our Wedding.",
    ]) expect(identitySettings).not.toContain(copy);
    expect(identitySettings).toContain("grid-cols-2 gap-3 sm:grid-cols-4");
  });

  it("updates is_saved independently and preserves lifecycle rows with meaning", () => {
    expect(vendorActions).toContain(".update({ is_saved: true })");
    expect(vendorActions).toContain(".update({ is_saved: false })");
    expect(vendorActions).toContain("shouldDeleteAfterUnsave");
    expect(vendorQueries).toContain('.eq("is_saved", true)');
    expect(vendorQueries).not.toContain('.eq("status", "saved")');
    expect(ourVendorsPage).not.toContain("No active lifecycle status");
  });

  it("keeps external vendors Couple-owned, out of public marketplace queries, and free of image upload behavior", () => {
    expect(vendorActions).toContain('.from("external_vendors")');
    expect(vendorActions).toContain('.eq("wedding_id", wedding.id)');
    expect(vendorActions).toContain("external_vendor_id: externalVendor.id");
    expect(vendorActions).not.toContain("image_storage_path");
    expect(marketplaceQuery).not.toContain('.from("external_vendors")');
    expect(ourVendorsPage).toContain('data-vendor-source={isExternal ? "external" : "marketplace"}');
    expect(ourVendorsPage).toContain("Added by you");
  });

  it("stores external agreed price without claiming or adding 050003 budget synchronization", () => {
    const externalAction = vendorActions.slice(vendorActions.indexOf("export async function saveExternalVendor"), vendorActions.indexOf("export async function deleteExternalVendor"));
    expect(externalAction).toContain("agreed_price_minor");
    expect(externalAction).not.toContain("budget_items");
  });
});
