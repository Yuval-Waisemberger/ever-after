import "@/app/vendor-account.css";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/user";
import { isProtectedAccessError, protectedAccessMessage } from "@/lib/auth/protected-access";
import { getVendorIdentity } from "@/lib/queries/vendor-dashboard";

export const dynamic = "force-dynamic";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  let profile;
  let identity;

  try {
    profile = await requireRole("vendor");
    identity = await getVendorIdentity(profile.displayName);
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
    <AppShell role="vendor" displayName={identity.displayName} vendorPhotoUrl={identity.photoUrl}>
      {children}
    </AppShell>
  );
}
