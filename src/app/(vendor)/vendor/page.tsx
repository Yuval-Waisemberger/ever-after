import type { Metadata } from "next";
import Link from "next/link";
import { getVendorDashboard } from "@/lib/queries/vendor-dashboard";
import { VendorDashboardView } from "@/components/vendor/vendor-dashboard-view";

export const metadata: Metadata = { title: "Vendor Dashboard" };
export default async function VendorDashboardPage() {
  const dashboard = await getVendorDashboard();
  if (!dashboard) return <main className="mx-auto max-w-4xl px-5 py-12"><section className="vendor-panel ea-surface ea-surface--champagne"><h1 className="font-display text-3xl">Set up your business profile</h1><p className="my-5 text-ink-soft">Introduce your business to Ever After.</p><Link href="/vendor/profile" className="ea-button ea-button--primary">Create your profile</Link></section></main>;
  return <VendorDashboardView dashboard={dashboard} />;
}
