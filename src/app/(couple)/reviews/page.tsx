import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { deleteReview } from "@/lib/actions/vendors";
import { getMyReviews } from "@/lib/queries/couple-vendors";

export const metadata: Metadata = { title: "My Reviews" };

export default async function MyReviewsPage() {
  const reviews = await getMyReviews();
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Shared experiences" title="My Reviews" description="Revisit the feedback you have shared with the wedding professionals who helped shape your day." action={<LinkButton href="/vendors" tone="secondary">Explore vendors</LinkButton>} />
      <div className="mt-8 space-y-4">
        {reviews.map((review) => {
          const vendor = Array.isArray(review.vendor_profiles) ? review.vendor_profiles[0] : review.vendor_profiles;
          if (!vendor) return null;
          const images = vendor.vendor_images ?? [];
          const primary = images.find((image) => image.is_primary) ?? images[0];
          const imageUrl = primary?.external_url ?? (primary?.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-media/${primary.storage_path}` : null);
          const rating = (review.professionalism + review.punctuality + review.service_attitude + review.value_for_money) / 4;
          return <article key={review.id} className="grid gap-5 rounded-2xl border bg-paper p-5 sm:grid-cols-[112px_1fr] sm:p-6">
            <div className="relative aspect-square overflow-hidden rounded-md bg-paper-muted">{imageUrl ? <Image src={imageUrl} alt={primary?.alt_text ?? vendor.business_name} fill sizes="112px" className="object-cover" /> : null}</div>
            <div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/vendors/${vendor.slug}`} className="font-display text-2xl hover:text-wine">{vendor.business_name}</Link><p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-wine"><Star className="size-3.5 fill-gold text-gold" />{rating.toFixed(1)}</p></div><form action={deleteReview}><input type="hidden" name="id" value={review.id} /><button className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-red-700" aria-label={`Delete review for ${vendor.business_name}`}><Trash2 className="size-4" />Delete</button></form></div>{review.review_text ? <p className="mt-4 text-sm leading-7 text-ink-soft">{review.review_text}</p> : <p className="mt-4 text-sm text-ink-soft">No written note was added.</p>}<div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft"><span>Professionalism {review.professionalism}/5</span><span>Punctuality {review.punctuality}/5</span><span>Service & attitude {review.service_attitude}/5</span><span>Value {review.value_for_money}/5</span><span>{review.would_choose_again ? "Would choose again" : "Would not choose again"}</span></div><Link href={`/vendors/${vendor.slug}`} className="mt-5 inline-flex text-sm font-semibold text-wine hover:underline">Open vendor profile to update →</Link></div>
          </article>;
        })}
        {!reviews.length ? <EmptyState title="No reviews yet" description="When you share feedback on a vendor profile, it will appear here." action={<LinkButton href="/vendors">Explore vendors</LinkButton>} /> : null}
      </div>
    </main>
  );
}
