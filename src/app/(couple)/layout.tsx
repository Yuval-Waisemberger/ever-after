import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export default async function CoupleLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("couple");
  return (
    <AppShell role="couple" displayName={profile.displayName}>
      {children}
    </AppShell>
  );
}
