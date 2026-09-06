import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ImageIcon, Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getVendorDashboard } from "@/lib/queries/vendor-dashboard";

export const metadata: Metadata = { title: "Vendor Dashboard" };

export default async function VendorDashboardPage() {
  const dashboard = await getVendorDashboard();
  if (!dashboard) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <PageHeader
          eyebrow="Vendor Dashboard"
          title="Set up your business profile"
          description="Add your business details to finish preparing your Vendor Dashboard."
          action={<Link href="/vendor/profile" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-wine px-5 text-sm font-semibold text-white">Start profile setup <ArrowRight className="size-4" /></Link>}
        />
      </main>
    );
  }
  const { profile, reviews, rating, completion } = dashboard;
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Vendor Dashboard" title={profile.business_name} description={profile.is_public ? "Your public profile is live in the marketplace." : "Your profile is private until you choose to publish it."} action={<Link href="/vendor/profile" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-wine px-5 text-sm font-semibold text-white">Edit profile <ArrowRight className="size-4" /></Link>} />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <section className="rounded-2xl border bg-paper p-6 md:col-span-2"><div className="flex items-end justify-between"><div><p className="eyebrow">Profile completion</p><h2 className="font-display mt-2 text-3xl">{completion.percentage}% complete</h2></div><span className="text-sm text-ink-soft">{profile.vendor_images?.length ?? 0} photos</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-paper-muted"><div className="h-full rounded-full bg-wine" style={{ width: `${completion.percentage}%` }} /></div>{completion.nextSteps.length ? <ul className="mt-5 grid gap-2 sm:grid-cols-2">{completion.nextSteps.slice(0, 4).map((step) => <li key={step} className="flex items-center gap-2 text-sm text-ink-soft"><ImageIcon className="size-3.5 text-gold" />{step}</li>)}</ul> : <p className="mt-5 text-sm text-sage">Your profile has all core details.</p>}</section>
        <section className="rounded-2xl border bg-paper p-6"><p className="eyebrow">Ratings</p><div className="mt-4 flex items-end gap-2"><Star className="mb-1 size-6 fill-gold text-gold" /><span className="font-display text-5xl">{rating?.toFixed(1) ?? "—"}</span></div><p className="mt-2 text-sm text-ink-soft">{reviews.length} public {reviews.length === 1 ? "review" : "reviews"}</p></section>
      </div>
      <section className="mt-7 rounded-2xl border bg-paper p-6"><h2 className="font-display text-3xl">Recent reviews</h2>{reviews.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{reviews.slice(0, 4).map((review) => <article key={review.id} className="rounded-xl bg-canvas p-4"><p className="font-semibold">{review.reviewer_display_name}</p><p className="mt-2 text-sm leading-6 text-ink-soft">{review.review_text || "Rating shared without a written note."}</p></article>)}</div> : <p className="mt-4 text-sm text-ink-soft">Reviews from couples will appear here. Vendors cannot edit them.</p>}</section>
    </main>
  );
}
