import { PageHeader } from "@/components/layout/page-header";
import { signOut } from "@/lib/actions/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function VendorSettingsPage() {
  return <main className="ea-consistent-page mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><PageHeader eyebrow="Vendor" title="Settings" description="Keep your Ever After business account comfortable and secure." /><section className="mt-8 max-w-2xl ea-surface ea-surface--standard p-5 sm:p-6"><h2 className="font-display text-2xl">Change password</h2><p className="mt-2 text-sm leading-6 text-ink-soft">Choose a new password for your Vendor account. You’ll sign in again after it changes.</p><div className="mt-5"><ChangePasswordForm /></div></section><form action={signOut} className="mt-5 max-w-2xl ea-surface ea-surface--tonal p-6"><h2 className="font-display text-2xl">Sign out</h2><button className="mt-5 ea-button ea-button--danger">Sign out</button></form></main>;
}
