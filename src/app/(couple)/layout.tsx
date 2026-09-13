import "@/app/couple-planning.css";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/user";
import { isProtectedAccessError, protectedAccessMessage } from "@/lib/auth/protected-access";
import { getOwnedWedding } from "@/lib/queries/wedding";
import { getCoupleIdentity } from "@/lib/queries/couple-identity";

export const dynamic = "force-dynamic";

export default async function CoupleLayout({ children }: { children: React.ReactNode }) {
  let profile;
  let wedding;
  let identity;

  try {
    profile = await requireRole("couple");
    [wedding, identity] = await Promise.all([getOwnedWedding(), getCoupleIdentity()]);
  } catch (error) {
    if (!isProtectedAccessError(error)) throw error;
    return (
      <main className="min-h-screen bg-canvas p-5">
        <p className="ea-feedback ea-feedback--error" role="alert">
          {protectedAccessMessage(error)}
        </p>
      </main>
    );
  }

  return (
    <AppShell role="couple" displayName={profile.displayName} showSetup={wedding.setup_status !== "completed"} avatarChoice={identity.avatarChoice} avatarPhotoUrl={identity.photoUrl}>
      {children}
    </AppShell>
  );
}
