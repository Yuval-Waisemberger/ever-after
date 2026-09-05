import { PageHeader } from "@/components/layout/page-header";
import { signOut } from "@/lib/actions/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function VendorSettingsPage() {
  return <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><PageHeader eyebrow="Vendor" title="Settings" description="Account access is managed securely through Supabase Auth." /><section className="mt-8 max-w-2xl rounded-2xl border bg-paper p-5 sm:p-6"><h2 className="font-display text-2xl">Change password</h2><p className="mt-2 text-sm leading-6 text-ink-soft">Choose a new password for your Vendor account. You’ll sign in again after it changes.</p><div className="mt-5"><ChangePasswordForm /></div></section><form action={signOut} className="mt-5 max-w-2xl rounded-2xl border bg-paper p-6"><h2 className="font-display text-2xl">Sign out</h2><p className="mt-2 text-sm text-ink-soft">End the active session on this browser.</p><button className="mt-5 min-h-11 rounded-full border border-red-800 px-5 text-sm font-semibold text-red-800">Sign out</button></form></main>;
}
