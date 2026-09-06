import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_BYTES,
  COUPLE_AVATAR_CHOICES,
  avatarExtension,
  isOwnedAvatarPath,
  normalizeAvatarChoice,
  validateAvatarFile,
} from "@/lib/domain/couple-identity";

describe("Couple identity domain", () => {
  it("uses Heart as the safe default and accepts every approved icon", () => {
    expect(COUPLE_AVATAR_CHOICES).toEqual(["heart", "woman_man", "woman_woman", "man_man"]);
    expect(normalizeAvatarChoice(undefined)).toBe("heart");
    expect(normalizeAvatarChoice("unexpected")).toBe("heart");
    for (const choice of COUPLE_AVATAR_CHOICES) expect(normalizeAvatarChoice(choice)).toBe(choice);
  });

  it("accepts only non-empty JPEG, PNG, and WebP files up to 5 MiB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateAvatarFile({ type, size: AVATAR_MAX_BYTES })).toBeNull();
    }
    expect(validateAvatarFile({ type: "image/jpeg", size: 0 })).toMatch(/choose an image/i);
    expect(validateAvatarFile({ type: "image/gif", size: 100 })).toMatch(/JPEG, PNG, or WebP/i);
    expect(validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES + 1 })).toMatch(/5 MiB/i);
  });

  it("generates only approved extensions and accepts only owner-scoped avatar names", () => {
    const owner = "101554c9-8d4c-4d11-adcf-39bfdd49135e";
    const uuid = "37a8d31f-0528-4aca-a6de-7aa931063828";
    expect(avatarExtension("image/jpeg")).toBe("jpg");
    expect(avatarExtension("image/png")).toBe("png");
    expect(avatarExtension("image/webp")).toBe("webp");
    expect(avatarExtension("image/gif")).toBeNull();
    expect(isOwnedAvatarPath(`${owner}/avatar-${uuid}.webp`, owner)).toBe(true);
    expect(isOwnedAvatarPath(`another-user/avatar-${uuid}.webp`, owner)).toBe(false);
    expect(isOwnedAvatarPath(`${owner}/nested/avatar-${uuid}.webp`, owner)).toBe(false);
    expect(isOwnedAvatarPath(`${owner}/avatar-not-a-uuid.webp`, owner)).toBe(false);
  });
});
