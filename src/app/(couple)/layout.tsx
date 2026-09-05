import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/user";
import { getOwnedWedding } from "@/lib/queries/wedding";

export const dynamic = "force-dynamic";

export default async function CoupleLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("couple");
  const wedding = await getOwnedWedding();
  return (
    <AppShell role="couple" displayName={profile.displayName} showSetup={wedding.setup_status !== "completed"}>
      {children}
    </AppShell>
  );
}
