import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "couple" | "vendor";

export type CurrentProfile = {
  id: string;
  role: AppRole;
  displayName: string;
};

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!data || (data.role !== "couple" && data.role !== "vendor")) return null;
  return { id: data.id, role: data.role, displayName: data.display_name };
});

export async function requireRole(role: AppRole): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/auth/${role}?message=Please sign in to continue`);
  if (profile.role !== role) redirect(profile.role === "couple" ? "/wedding" : "/vendor");
  return profile;
}
