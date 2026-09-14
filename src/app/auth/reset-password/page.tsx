import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { RecoveryPage } from "@/components/auth/recovery-page";
import { ResetPasswordPanel } from "@/components/auth/password-recovery-panel";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const audience = params.audience === "couple" || params.audience === "vendor" ? params.audience : undefined;
  const issue = params.issue === "expired" || params.issue === "invalid" || params.issue === "unavailable" ? params.issue : undefined;
  let available = false;
  if (!issue && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getClaims();
      available = !error && typeof data?.claims?.sub === "string";
    } catch {
      available = false;
    }
  }
  return <RecoveryPage publicNavigation authAudience={audience}><ResetPasswordPanel audience={audience} available={available} issue={issue} /></RecoveryPage>;
}
