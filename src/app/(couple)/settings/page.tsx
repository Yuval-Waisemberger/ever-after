import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { signOut } from "@/lib/actions/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { CoupleAvatarSettings } from "@/components/couple/couple-avatar-settings";
import { getCoupleIdentity } from "@/lib/queries/couple-identity";

export const metadata: Metadata = { title: "Settings" };

export default async function CoupleSettingsPage() {
  const identity = await getCoupleIdentity();
  return <main className="ea-consistent-page mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><PageHeader eyebrow="Account" title="Settings" description="Keep your shared Ever After account comfortable and secure." /><div className="mt-8"><CoupleAvatarSettings profileId={identity.profileId} choice={identity.avatarChoice} storagePath={identity.avatarStoragePath} photoUrl={identity.photoUrl} /></div><section className="mt-5 max-w-2xl ea-surface ea-surface--standard p-5 sm:p-6"><h2 className="font-display text-2xl">Change password</h2><p className="mt-2 text-sm leading-6 text-ink-soft">Choose a new password for this shared Couple account. You’ll sign in again after it changes.</p><div className="mt-5"><ChangePasswordForm /></div></section><form action={signOut} className="mt-5 max-w-2xl ea-surface ea-surface--tonal p-6"><h2 className="font-display text-2xl">Sign out</h2><button className="mt-5 ea-button ea-button--danger">Sign out</button></form></main>;
}
