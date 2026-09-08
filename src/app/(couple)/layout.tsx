import "@/app/couple-planning.css";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/user";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { getCoupleIdentity } from "@/lib/queries/couple-identity";

export const dynamic = "force-dynamic";

export default async function CoupleLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("couple");
  const [wedding, identity] = await Promise.all([getOwnedWedding(), getCoupleIdentity()]);
  return (
    <AppShell role="couple" displayName={profile.displayName} showSetup={wedding.setup_status !== "completed"} avatarChoice={identity.avatarChoice} avatarPhotoUrl={identity.photoUrl}>
      {children}
    </AppShell>
  );
}
