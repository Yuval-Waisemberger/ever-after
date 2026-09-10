"use server";

import { revalidatePath } from "next/cache";
import { getOwnedVendorProfile } from "@/lib/queries/vendor-dashboard";
import { createClient } from "@/lib/supabase/server";
import { isVendorImagePath, vendorImageError } from "@/lib/domain/vendor-media";
import type { ActionState } from "./state";

async function changePhoto(path: string | null): Promise<ActionState> {
  const profile = await getOwnedVendorProfile();
  if (!profile) return { status: "error", message: "Create your business profile first." };
  if (path !== null && !isVendorImagePath(path, profile.id, true)) {
    return { status: "error", message: "The profile image path is invalid." };
  }
  const supabase = await createClient();
  const storage = supabase.storage.from("vendor-media");
  const previous = profile.profile_image_storage_path;
  if (previous === path) return { status: "success", message: "Profile image is already saved." };
  if (path) {
    const { data, error } = await storage.download(path);
    if (error || !data || vendorImageError(data)) {
      await storage.remove([path]).catch(() => undefined);
      return { status: "error", message: "The uploaded image could not be verified. Use JPG, PNG, or WebP up to 5 MB." };
    }
  }
  // Compare the saved path so two open tabs cannot replace each other's changes.
  let update = supabase.from("vendor_profiles")
    .update({ profile_image_storage_path: path }).eq("id", profile.id);
  update = previous ? update.eq("profile_image_storage_path", previous) : update.is("profile_image_storage_path", null);
  const { data, error } = await update.select("id").maybeSingle();
  if (error || !data) {
    // A concurrent retry may already have saved this exact object.
    const current = await getOwnedVendorProfile();
    if (path && current && current.profile_image_storage_path !== path) await storage.remove([path]).catch(() => undefined);
    return { status: "error", message: "Profile image could not be saved. Refresh and try again." };
  }
  if (previous && isVendorImagePath(previous, profile.id, true)) {
    await storage.remove([previous]).catch(() => undefined);
  }
  revalidatePath("/(vendor)", "layout");
  revalidatePath("/vendors");
  return { status: "success", message: path ? "Profile image saved." : "Profile image removed." };
}

export async function saveVendorProfileImage(path: string): Promise<ActionState> {
  return changePhoto(path);
}

export async function removeVendorProfileImage(): Promise<ActionState> {
  return changePhoto(null);
}
