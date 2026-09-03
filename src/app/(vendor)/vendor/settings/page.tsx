import { PageHeader } from "@/components/layout/page-header";
import { signOut } from "@/lib/actions/auth";

export default function VendorSettingsPage() {
  return <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><PageHeader eyebrow="Vendor" title="Settings" description="Account access is managed securely through Supabase Auth." /><form action={signOut} className="mt-8 rounded-2xl border bg-paper p-6"><button className="min-h-11 rounded-full border border-red-800 px-5 text-sm font-semibold text-red-800">Sign out</button></form></main>;
}
