import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Star, Store, Heart } from "lucide-react";
import { VendorReveal, VendorStars } from "@/components/vendor/vendor-motion";
import "@/app/vendor-account.css";
import "@/app/reviews-polish.css";
import { PageHeader } from "@/components/layout/page-header";
import "./reviews.css";
import { LinkButton } from "@/components/ui/link-button";
import { deleteReview } from "@/lib/actions/vendors";
import { getMyReviews } from "@/lib/queries/couple-vendors";

export const metadata: Metadata = { title: "Our Reviews" };

export default async function MyReviewsPage() {
  const reviews = await getMyReviews();
  return (
    <main className="couple-reviews-page ea-consistent-page mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Shared experiences" title="Our Reviews" description="Revisit the feedback you have shared with the wedding professionals who helped shape your day." action={<LinkButton href="/vendors" tone="secondary">Explore vendors</LinkButton>} />
      <section className="couple-reviews-card ea-surface ea-surface--standard" aria-label="Our Reviews">
        <div className="couple-reviews-card-heading"><h2 className="eyebrow">Our Reviews</h2><span>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span></div>
      <div className="space-y-4">
        {reviews.map((review, index) => {
          const vendor = Array.isArray(review.vendor_profiles) ? review.vendor_profiles[0] : review.vendor_profiles;
          if (!vendor) return null;
          const images = vendor.vendor_images ?? [];
          const primary = images.find((image) => image.is_primary) ?? images[0];
          const imageUrl = primary?.external_url ?? (primary?.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-media/${primary.storage_path}` : null);
          const rating = (review.professionalism + review.punctuality + review.service_attitude + review.value_for_money) / 4;
          return <VendorReveal key={review.id} delay={Math.min(index, 3) * 150} className="couple-review-reveal"><article className="ea-surface ea-surface--standard grid gap-5 p-5 sm:grid-cols-[112px_1fr] sm:p-6">
            <div className="relative aspect-square overflow-hidden rounded-md bg-paper-muted">{imageUrl ? <Image src={imageUrl} alt={primary?.alt_text ?? vendor.business_name} fill sizes="(max-width: 639px) calc(100vw - 80px), 112px" className="object-cover" /> : null}</div>
            <div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/vendors/${vendor.slug}`} className="font-display text-2xl hover:text-wine">{vendor.business_name}</Link><div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-wine"><VendorStars rating={rating} /><span aria-hidden="true">{rating.toFixed(1)}</span></div><p className="mt-2 text-xs text-ink-soft">Updated <time dateTime={review.updated_at}>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jerusalem" }).format(new Date(review.updated_at))}</time></p></div><form action={deleteReview}><input type="hidden" name="id" value={review.id} /><button className="ea-button ea-button--danger" aria-label={`Delete review for ${vendor.business_name}`}><Trash2 className="size-4" />Delete</button></form></div>{review.review_text ? <p dir="auto" className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-ink-soft">{review.review_text}</p> : <p className="mt-4 text-sm text-ink-soft">No written note was added.</p>}<div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft"><span>Professionalism {review.professionalism}/5</span><span>Punctuality {review.punctuality}/5</span><span>Service & attitude {review.service_attitude}/5</span><span>Value {review.value_for_money}/5</span><span>{review.would_choose_again ? "Would choose again" : "Would not choose again"}</span></div><Link href={`/vendors/${vendor.slug}`} className="mt-5 inline-flex text-sm font-semibold text-wine hover:underline">Open vendor profile to update →</Link></div>
          </article></VendorReveal>;
        })}
        {!reviews.length ? <div className="couple-reviews-empty"><span className="couple-reviews-star" aria-hidden="true"><Star size={42} strokeWidth={1.5} /></span><h3>No reviews yet</h3><p>When you share feedback on a vendor profile, it will appear here.</p><LinkButton href="/vendors">Explore vendors</LinkButton></div> : null}
      </div>
      </section>
      <section className="couple-reviews-guide ea-surface ea-surface--standard" aria-labelledby="sharing-experience"><h2 id="sharing-experience">Sharing your experience</h2><div className="couple-reviews-steps">{[[Store, "Visit a Vendor profile", "Choose a professional you worked with."], [Star, "Share your feedback", "Add a rating and a thoughtful note."], [Heart, "Help other couples", "Your experience can guide their choice."]] .map(([Icon, title, description]) => { const StepIcon = Icon as typeof Star; return <div key={String(title)}><StepIcon size={36} strokeWidth={1.5} aria-hidden="true" /><h3>{String(title)}</h3><p>{String(description)}</p></div>; })}</div></section>
    </main>
  );
}
