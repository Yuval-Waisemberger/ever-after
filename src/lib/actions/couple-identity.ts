"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/user";
import {
  COUPLE_AVATAR_CHOICES,
  isOwnedAvatarPath,
} from "@/lib/domain/couple-identity";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./state";

const avatarChoiceSchema = z.enum(COUPLE_AVATAR_CHOICES);

function refreshIdentityViews() {
  revalidatePath("/", "layout");
  revalidatePath("/wedding");
  revalidatePath("/settings");
}

async function removeStoredPhoto(path: string | null) {
  if (!path) return;
  const supabase = await createClient();
  await supabase.storage.from("couple-media").remove([path]);
}

export async function chooseCoupleAvatar(value: unknown): Promise<ActionState> {
  const parsed = avatarChoiceSchema.safeParse(value);
  if (!parsed.success) return { status: "error", message: "Choose a valid Couple icon." };
  const profile = await requireRole("couple");
  const supabase = await createClient();
  const previousPath = profile.avatarStoragePath;
  const { error } = await supabase.from("profiles").update({
    avatar_choice: parsed.data,
    avatar_storage_path: null,
  }).eq("id", profile.id);
  if (error) return { status: "error", message: "Your Couple icon could not be saved." };
  await removeStoredPhoto(previousPath);
  refreshIdentityViews();
  return { status: "success", message: "Your Couple icon is now shown across Ever After." };
}

export async function saveCouplePhoto(storagePath: string): Promise<ActionState> {
  const profile = await requireRole("couple");
  if (!isOwnedAvatarPath(storagePath, profile.id)) {
    return { status: "error", message: "The uploaded photo path is invalid." };
  }
  const supabase = await createClient();
  const { data: objects, error: lookupError } = await supabase.storage
    .from("couple-media")
    .list(profile.id, { search: storagePath.slice(profile.id.length + 1), limit: 2 });
  if (lookupError || !objects?.some((object) => `${profile.id}/${object.name}` === storagePath)) {
    return { status: "error", message: "The uploaded photo could not be verified." };
  }
  const previousPath = profile.avatarStoragePath;
  const { error } = await supabase.from("profiles")
    .update({ avatar_storage_path: storagePath })
    .eq("id", profile.id);
  if (error) return { status: "error", message: "Your Couple photo could not be saved." };
  if (previousPath && previousPath !== storagePath) await removeStoredPhoto(previousPath);
  refreshIdentityViews();
  return { status: "success", message: "Your Couple photo is now shown across Ever After." };
}

export async function removeCouplePhoto(): Promise<ActionState> {
  const profile = await requireRole("couple");
  const previousPath = profile.avatarStoragePath;
  if (!previousPath) return { status: "success", message: "Your selected icon is already in use." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles")
    .update({ avatar_storage_path: null })
    .eq("id", profile.id);
  if (error) return { status: "error", message: "Your Couple photo could not be removed." };
  await removeStoredPhoto(previousPath);
  refreshIdentityViews();
  return { status: "success", message: "Photo removed. Your selected icon is now shown." };
}
