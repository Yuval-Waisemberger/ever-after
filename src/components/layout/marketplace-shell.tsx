import type { ReactNode } from "react";
import type { CurrentProfile } from "@/lib/auth/user";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { getCoupleIdentity } from "@/lib/queries/couple-identity";
import { AppShell } from "./app-shell";
import { PublicHeader } from "./public-header";

/** Select the existing shell on the server, before emitting Marketplace content. */
export async function MarketplaceShell({ profile, children }: { profile: CurrentProfile | null; children: ReactNode }) {
  const content = <div className="public-theme directory-page min-h-screen">{!profile ? <PublicHeader /> : null}{children}</div>;
  if (!profile) return content;
  if (profile.role === "vendor") return <AppShell role="vendor" displayName={profile.displayName} activeHref="/vendors">{content}</AppShell>;
  const [wedding, identity] = await Promise.all([getOwnedWedding(), getCoupleIdentity()]);
  return <AppShell role="couple" displayName={profile.displayName} showSetup={wedding.setup_status !== "completed"} avatarChoice={identity.avatarChoice} avatarPhotoUrl={identity.photoUrl} activeHref="/vendors">{content}</AppShell>;
}
