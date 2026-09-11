export const COUPLE_AVATAR_CHOICES = [
  "heart",
  "woman_man",
  "woman_woman",
  "man_man",
] as const;

export type CoupleAvatarChoice = (typeof COUPLE_AVATAR_CHOICES)[number];

export const COUPLE_AVATAR_LABELS: Record<CoupleAvatarChoice, string> = {
  heart: "Heart",
  woman_man: "Bride + Groom",
  woman_woman: "Bride + Bride",
  man_man: "Groom + Groom",
};

export const COUPLE_AVATAR_ARTWORK: Record<CoupleAvatarChoice, string> = {
  heart: "/images/couple-settings/heart.png?v=2",
  woman_man: "/images/couple-settings/bride-and-groom.png?v=2",
  woman_woman: "/images/couple-settings/bride-and-bride.png?v=2",
  man_man: "/images/couple-settings/groom-and-groom.png?v=2",
};

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const avatarMimeTypes = new Set<string>(AVATAR_MIME_TYPES);

export function normalizeAvatarChoice(value: unknown): CoupleAvatarChoice {
  return COUPLE_AVATAR_CHOICES.includes(value as CoupleAvatarChoice)
    ? (value as CoupleAvatarChoice)
    : "heart";
}

export function validateAvatarFile(file: Pick<File, "size" | "type">): string | null {
  if (file.size <= 0) return "Choose an image first.";
  if (!avatarMimeTypes.has(file.type)) return "Use a JPEG, PNG, or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "Keep the photo at or below 5 MiB.";
  return null;
}

export function avatarExtension(mimeType: string): "jpg" | "png" | "webp" | null {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

export function isOwnedAvatarPath(path: string, ownerId: string): boolean {
  if (!path.startsWith(`${ownerId}/`)) return false;
  const fileName = path.slice(ownerId.length + 1);
  return /^avatar-[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(fileName);
}
