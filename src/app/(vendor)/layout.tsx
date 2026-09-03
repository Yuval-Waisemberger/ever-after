import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("vendor");
  return (
    <AppShell role="vendor" displayName={profile.displayName}>
      {children}
    </AppShell>
  );
}
