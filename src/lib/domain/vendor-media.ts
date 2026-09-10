export const MAX_VENDOR_IMAGES = 3;
export const MAX_VENDOR_IMAGE_BYTES = 5 * 1024 * 1024;
export const VENDOR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function vendorImageError(file: { size: number; type: string }) {
  if (!file.size) return "Choose an image first.";
  if (!VENDOR_IMAGE_TYPES.includes(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size > MAX_VENDOR_IMAGE_BYTES) return "Keep images under 5 MB.";
  return null;
}

export function isVendorImagePath(path: string, vendorId: string, identity: boolean) {
  const parts = path.split("/");
  const file = parts.at(-1) ?? "";
  return parts[0] === vendorId && parts.length === (identity ? 3 : 2)
    && (!identity || parts[1] === "profile")
    && /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(file);
}

export function orderedVendorImages<T extends { sort_order: number; id: string }>(images: T[]) {
  return [...images].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}
