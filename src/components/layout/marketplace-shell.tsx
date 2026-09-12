import type { ReactNode } from "react";
import type { CurrentProfile } from "@/lib/auth/user";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { getCoupleIdentity } from "@/lib/queries/couple-identity";
import { getVendorIdentity } from "@/lib/queries/vendor-dashboard";
import { AppShell } from "./app-shell";
import { LandingNavigation } from "@/components/public/landing-navigation";
import "@/app/public-auth.css";

/** Select the existing shell on the server, before emitting Marketplace content. */
export async function MarketplaceShell({ profile, children, contentClassName = "public-theme directory-page min-h-screen" }: { profile: CurrentProfile | null; children: ReactNode; contentClassName?: string }) {
  const content = <div className={contentClassName}>{!profile ? <LandingNavigation context="auth" /> : null}{children}</div>;
  if (!profile) return content;
  if (profile.role === "vendor") {
    const identity = await getVendorIdentity(profile.displayName);
    return <AppShell role="vendor" displayName={identity.displayName} vendorPhotoUrl={identity.photoUrl} activeHref="/vendors">{content}</AppShell>;
  }
  const [wedding, identity] = await Promise.all([getOwnedWedding(), getCoupleIdentity()]);
  return <AppShell role="couple" displayName={profile.displayName} showSetup={wedding.setup_status !== "completed"} avatarChoice={identity.avatarChoice} avatarPhotoUrl={identity.photoUrl} activeHref="/vendors">{content}</AppShell>;
}
