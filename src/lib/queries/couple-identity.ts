import { cache } from "react";
import { requireRole } from "@/lib/auth/user";
import { isOwnedAvatarPath } from "@/lib/domain/couple-identity";
import { createClient } from "@/lib/supabase/server";

export const getCoupleIdentity = cache(async () => {
  const profile = await requireRole("couple");
  let photoUrl: string | null = null;

  if (profile.avatarStoragePath && isOwnedAvatarPath(profile.avatarStoragePath, profile.id)) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from("couple-media")
      .createSignedUrl(profile.avatarStoragePath, 60 * 60);
    if (!error) photoUrl = data.signedUrl;
  }

  return {
    profileId: profile.id,
    displayName: profile.displayName,
    avatarChoice: profile.avatarChoice,
    avatarStoragePath: profile.avatarStoragePath,
    photoUrl,
  };
});
