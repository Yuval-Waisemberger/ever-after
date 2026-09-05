import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/user";
import { safeInternalPath } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const audience = url.searchParams.get("audience");
  const recoveryFlow = url.searchParams.get("flow") === "recovery";
  const failure = (issue: "invalid" | "expired" | "profile") => {
    const target = new URL(recoveryFlow ? "/auth/reset-password" : "/auth/verification", url.origin);
    target.searchParams.set("issue", issue);
    if (audience === "couple" || audience === "vendor") target.searchParams.set("audience", audience);
    return NextResponse.redirect(target);
  };
  if (url.searchParams.has("error") || url.searchParams.has("error_code")) {
    return failure(url.searchParams.get("error_code") === "otp_expired" ? "expired" : "invalid");
  }
  if (!code || !isSupabaseConfigured()) return failure("invalid");
  try {
    const supabase = await createClient();
    // The installed SDK includes this hint when it stores a per-flow PKCE verifier.
    const flowId = url.searchParams.get("sb_flow_id");
    const { error } = flowId
      ? await supabase.auth.exchangeCodeForSession(code, { flowId })
      : await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure(error.code === "otp_expired" ? "expired" : "invalid");
    if (recoveryFlow) {
      const target = new URL("/auth/reset-password", url.origin);
      if (audience === "couple" || audience === "vendor") target.searchParams.set("audience", audience);
      return NextResponse.redirect(target);
    }
    // Stored profile is authoritative; audience is only a recovery UI hint.
    const profile = await getCurrentProfile();
    if (!profile) return failure("profile");
    let destination = "/vendor";
    if (profile.role === "couple") {
      const { data: wedding, error: weddingError } = await supabase.from("weddings")
        .select("setup_status").eq("owner_user_id", profile.id).maybeSingle();
      if (weddingError || !wedding) return failure("profile");
      destination = wedding.setup_status === "not_started" ? "/wedding/setup" : "/wedding";
    }
    const next = safeInternalPath(url.searchParams.get("next"), destination);
    return NextResponse.redirect(new URL(next, url.origin));
  } catch {
    return failure("invalid");
  }
}
