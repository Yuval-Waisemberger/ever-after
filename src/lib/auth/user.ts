import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeAvatarChoice, type CoupleAvatarChoice } from "@/lib/domain/couple-identity";
import { ProtectedAccessError } from "@/lib/auth/protected-access";

export type AppRole = "couple" | "vendor";

export type CurrentProfile = {
  id: string;
  role: AppRole;
  displayName: string;
  avatarChoice: CoupleAvatarChoice;
  avatarStoragePath: string | null;
};

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  // Public pages should not make a Frankfurt round trip for visitors who have
  // no Supabase session at all.
  if (!hasAuthCookie) return null;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (typeof userId !== "string" || !userId) return null;

  return resolveAuthenticatedProfile(supabase, userId);
});

const getProtectedCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  if (!isSupabaseConfigured()) {
    throw new ProtectedAccessError("auth_unavailable");
  }

  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  if (!hasAuthCookie) return null;

  const supabase = await createClient();
  let claimsResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;

  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    throw new ProtectedAccessError("auth_unavailable");
  }

  if (claimsResult.error) {
    throw new ProtectedAccessError("auth_unavailable");
  }

  const userId = claimsResult.data?.claims?.sub;
  if (typeof userId !== "string" || !userId) return null;

  const profileQuery = supabase
    .from("profiles")
    .select("id, role, display_name, avatar_choice, avatar_storage_path")
    .eq("id", userId)
    .maybeSingle();

  let profileResult: Awaited<typeof profileQuery>;
  try {
    profileResult = await profileQuery;
  } catch {
    throw new ProtectedAccessError("profile_unavailable");
  }

  const { data, error } = profileResult;

  if (error) {
    throw new ProtectedAccessError("profile_unavailable");
  }

  if (!data || (data.role !== "couple" && data.role !== "vendor")) {
    throw new ProtectedAccessError("profile_integrity");
  }

  return {
    id: data.id,
    role: data.role,
    displayName: data.display_name,
    avatarChoice: normalizeAvatarChoice(data.avatar_choice),
    avatarStoragePath: data.avatar_storage_path,
  };
});

/** Canonical own-profile lookup, shared by route guards and password login. */
export async function resolveAuthenticatedProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<CurrentProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, display_name, avatar_choice, avatar_storage_path")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || (data.role !== "couple" && data.role !== "vendor")) return null;
  return {
    id: data.id,
    role: data.role,
    displayName: data.display_name,
    avatarChoice: normalizeAvatarChoice(data.avatar_choice),
    avatarStoragePath: data.avatar_storage_path,
  };
}

export async function requireRole(role: AppRole): Promise<CurrentProfile> {
  const profile = await getProtectedCurrentProfile();
  if (!profile) redirect(`/auth/${role}?message=Please sign in to continue`);
  if (profile.role !== role) redirect(profile.role === "couple" ? "/wedding" : "/vendor");
  return profile;
}
