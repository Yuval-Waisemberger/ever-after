import "@/app/vendor-account.css";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/user";
import { getVendorIdentity } from "@/lib/queries/vendor-dashboard";

export const dynamic = "force-dynamic";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("vendor");
  const identity = await getVendorIdentity(profile.displayName);
  return (
    <AppShell role="vendor" displayName={identity.displayName} vendorPhotoUrl={identity.photoUrl}>
      {children}
    </AppShell>
  );
}
