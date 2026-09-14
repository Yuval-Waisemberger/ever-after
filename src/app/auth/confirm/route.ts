import { NextResponse } from "next/server";
import { emailLinkIssue, providerRoleHint, verifiedEmailLoginPath } from "@/lib/auth/email-confirmation";
import { configuredSiteOrigin } from "@/lib/auth/redirect";
import { resolveAuthenticatedProfile } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type SupportedType = "email" | "recovery";

function confirmationFailure(
  origin: string,
  type: SupportedType,
  issue: "invalid" | "expired" | "profile" | "unavailable",
) {
  const target = new URL(type === "recovery" ? "/auth/reset-password" : "/auth/verification", origin);
  target.searchParams.set("issue", issue);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  let origin: string;
  try {
    origin = configuredSiteOrigin();
  } catch {
    return new Response("Authentication is temporarily unavailable.", { status: 503 });
  }
  const tokenHash = url.searchParams.get("token_hash")?.trim();
  const type = url.searchParams.get("type");

  if (type !== "email" && type !== "recovery") {
    return confirmationFailure(origin, "email", "invalid");
  }
  if (!tokenHash) return confirmationFailure(origin, type, "invalid");
  if (!isSupabaseConfigured()) return confirmationFailure(origin, type, "unavailable");

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;
  try {
    result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  } catch {
    return confirmationFailure(origin, type, "unavailable");
  }

  if (result.error) return confirmationFailure(origin, type, emailLinkIssue(result.error));

  const { session, user } = result.data;
  if (!user) return confirmationFailure(origin, type, "unavailable");

  const fallbackRole = providerRoleHint(user);
  if (!session?.access_token) {
    return type === "email" && fallbackRole
      ? NextResponse.redirect(new URL(verifiedEmailLoginPath(fallbackRole), origin))
      : confirmationFailure(origin, type, type === "email" ? "profile" : "unavailable");
  }

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || data?.claims?.sub !== user.id) {
      return type === "email" && fallbackRole
        ? NextResponse.redirect(new URL(verifiedEmailLoginPath(fallbackRole), origin))
        : confirmationFailure(origin, type, type === "email" ? "profile" : "unavailable");
    }
  } catch {
    return type === "email" && fallbackRole
      ? NextResponse.redirect(new URL(verifiedEmailLoginPath(fallbackRole), origin))
      : confirmationFailure(origin, type, type === "email" ? "profile" : "unavailable");
  }

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/auth/reset-password", origin));
  }

  let profile;
  try {
    profile = await resolveAuthenticatedProfile(supabase, user.id);
  } catch {
    return confirmationFailure(origin, type, "profile");
  }
  if (!profile) return confirmationFailure(origin, type, "profile");

  return NextResponse.redirect(new URL(profile.role === "couple" ? "/wedding" : "/vendor", origin));
}
