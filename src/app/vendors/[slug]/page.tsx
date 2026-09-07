import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, Instagram, Mail, MapPin, Phone, Star } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { VendorStatusActions } from "@/components/vendors/vendor-status-actions";
import { ReviewForm } from "@/components/vendors/review-form";
import { getCurrentProfile } from "@/lib/auth/user";
import { formatIls } from "@/lib/domain/budget";
import { getVendorRelationship } from "@/lib/queries/couple-vendors";
import { getVendorBySlug } from "@/lib/queries/vendors";

export async function generateMetadata({ params }: PageProps<"/vendors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Vendor not found", openGraph: { images: [] }, twitter: { images: [] } };
  return {
    title: vendor.businessName,
    description: vendor.description ?? `${vendor.businessName} wedding vendor profile`,
    openGraph: { title: vendor.businessName, description: vendor.description ?? undefined, images: vendor.imageUrl ? [{ url: vendor.imageUrl, alt: vendor.imageAlt }] : [] },
    twitter: { card: "summary_large_image", title: vendor.businessName, description: vendor.description ?? undefined, images: vendor.imageUrl ? [vendor.imageUrl] : [] },
  };
}

export default async function VendorProfilePage({ params, searchParams }: PageProps<"/vendors/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();
  const profile = await getCurrentProfile();
  const relationship = profile?.role === "couple" ? await getVendorRelationship(vendor.id) : null;
  const area = vendor.serviceAreas.map((value) => value.replaceAll("_", " ")).join(" · ");

  return (
    <div className="vendor-profile-page min-h-screen bg-canvas">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      {query.relationship === "error" ? <p role="alert" className="ea-feedback ea-feedback--error mt-5">The vendor change and budget could not be saved. Please try again.</p> : null}
      {query.relationship === "financial-history" ? <p role="alert" className="ea-feedback ea-feedback--error mt-5">This vendor could not be deleted. If it has financial history, change its lifecycle instead; payments must be preserved.</p> : null}
        {query.relationship === "updated" ? <p role="status" className="mb-5 rounded-xl border border-wine/20 bg-wine/5 px-4 py-3 text-sm text-wine">Your vendor list has been updated.</p> : null}
        <Link href="/vendors" className="inline-flex items-center gap-2 text-sm font-semibold text-wine hover:underline"><ArrowLeft className="size-4" />Back to vendors</Link>
        <div className="vendor-profile-hero mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="vendor-profile-image relative aspect-[4/3] overflow-hidden border bg-paper-muted">
            {vendor.imageUrl ? <Image src={vendor.imageUrl} alt={vendor.imageAlt} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" /> : <div className="grid h-full place-items-center font-display text-4xl">{vendor.businessName}</div>}
          </div>
          <section className="vendor-profile-intro self-center">
            <p className="eyebrow">{vendor.subcategoryName ?? vendor.categoryName}</p>
            <h1 className="font-display mt-3 text-5xl leading-[0.98] tracking-tight sm:text-6xl">{vendor.businessName}</h1>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-wine" />{[vendor.locationCity, area].filter(Boolean).join(" · ") || "Service area not set"}</span>
              {vendor.ratingAverage != null ? <span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-gold text-gold" />{vendor.ratingAverage.toFixed(1)} · {vendor.reviewCount} reviews</span> : <span>No reviews yet</span>}
            </div>
            <p className="mt-6 text-lg leading-8 text-ink-soft">{vendor.description}</p>
            <p className="ea-money mt-6 text-3xl text-wine">{vendor.minPriceMinor == null ? "Price on request" : `${formatIls(vendor.minPriceMinor)}${vendor.maxPriceMinor ? `–${formatIls(vendor.maxPriceMinor)}` : ""}${vendor.categorySlug === "venues" ? " per guest" : ""}`}</p>
            {profile?.role === "couple" ? <div className="mt-7 border-t pt-6"><VendorStatusActions vendorId={vendor.id} currentStatus={relationship?.status} isSaved={relationship?.is_saved === true} returnTo={`/vendors/${vendor.slug}`} /></div> : <div className="mt-7"><Link href="/auth/couple" className="inline-flex min-h-11 items-center rounded-full bg-wine px-5 text-sm font-semibold text-white">Sign in to save this vendor</Link></div>}
          </section>
        </div>

        <div className="vendor-profile-details mt-10 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border bg-paper p-6 lg:col-span-2">
            <h2 className="font-display text-3xl">Services & style</h2>
            <div className="mt-5 flex flex-wrap gap-2">{vendor.services.map((service) => <span key={service} className="rounded-full border bg-paper-muted px-3 py-1.5 text-sm">{service}</span>)}</div>
            {vendor.styles.length ? <div className="mt-6"><h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">Known for</h3><p className="mt-2 text-sm leading-7">{vendor.styles.join(" · ")}</p></div> : null}
            {vendor.minGuestCapacity || vendor.maxGuestCapacity ? <p className="mt-5 text-sm text-ink-soft">Guest capacity: {vendor.minGuestCapacity ?? "Any"}–{vendor.maxGuestCapacity ?? "Any"}</p> : null}
          </section>
          <aside className="rounded-2xl border bg-paper p-6">
            <h2 className="font-display text-3xl">Contact</h2>
            <div className="mt-5 space-y-3 text-sm">
              {vendor.phone ? <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 hover:text-wine"><Phone className="size-4" />{vendor.phone}</a> : null}
              {vendor.email ? <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 hover:text-wine"><Mail className="size-4" />{vendor.email}</a> : null}
              {vendor.websiteUrl ? <a href={vendor.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-wine"><Globe className="size-4" />Website</a> : null}
              {vendor.instagramUrl ? <a href={vendor.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-wine"><Instagram className="size-4" />Instagram</a> : null}
              {!vendor.phone && !vendor.email && !vendor.websiteUrl && !vendor.instagramUrl ? <p className="text-ink-soft">Contact details have not been added yet.</p> : null}
            </div>
          </aside>
        </div>

        <section className="vendor-reviews mt-10 border p-6 sm:p-8">
          <h2 className="font-display text-4xl">Ratings & reviews</h2>
          {vendor.reviews.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{vendor.reviews.map((review) => <article key={review.id} className="rounded-xl border bg-canvas/50 p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{review.reviewerDisplayName}</h3><span className="inline-flex items-center gap-1 text-sm font-bold"><Star className="size-3.5 fill-gold text-gold" />{((review.professionalism + review.punctuality + review.serviceAttitude + review.valueForMoney) / 4).toFixed(1)}</span></div>{review.reviewText ? <p className="mt-3 text-sm leading-6 text-ink-soft">{review.reviewText}</p> : null}<p className="mt-4 text-xs text-ink-soft">{review.wouldChooseAgain ? "Would choose again" : "Would not choose again"}</p></article>)}</div> : <p className="mt-4 text-sm text-ink-soft">No public reviews yet.</p>}
          {profile?.role === "couple" ? <details className="mt-8 border-t pt-5"><summary className="cursor-pointer font-semibold text-wine">Write or update your review</summary><div className="mt-5 max-w-2xl"><ReviewForm vendorId={vendor.id} vendorSlug={vendor.slug} displayName={profile.displayName} /></div></details> : null}
        </section>
      </main>
    </div>
  );
}
