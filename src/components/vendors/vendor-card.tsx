import "@/app/marketplace-polish.css";
import { RecommendationDetail } from "./recommendation-detail";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star } from "lucide-react";
import { formatIls } from "@/lib/domain/budget";
import type { MarketplaceVendor } from "@/lib/vendors/types";
import { SavedVendorButton } from "@/components/vendors/saved-vendor-button";

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function VendorCard({ vendor, canSave = false, returnTo = "/vendors" }: { vendor: MarketplaceVendor; canSave?: boolean; returnTo?: string }) {
  return (
    <article className="vendor-card group relative overflow-hidden rounded-2xl border bg-paper">
      {canSave ? <div className="absolute right-3 top-3 z-10"><SavedVendorButton vendorId={vendor.id} isSaved={vendor.isSaved === true} returnTo={returnTo} compact /></div> : <Link href="/auth/couple?mode=login" className="vendor-save-button absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full border bg-paper/90 text-wine" aria-label="Sign in to save vendor"><Heart size={17} aria-hidden="true" /></Link>}
      <Link href={`/vendors/${vendor.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-paper-muted">
          {vendor.imageUrl ? (
            <Image src={vendor.imageUrl} alt={vendor.imageAlt} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.025]" />
          ) : (
            <div className="grid h-full place-items-center font-display text-2xl text-ink-soft">{vendor.businessName}</div>
          )}

        </div>
        <div className="p-5">
          <div className="vendor-card-heading flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-wine">{vendor.subcategoryName ?? vendor.categoryName}</p>
              <h2 className="font-display mt-1 text-2xl leading-tight">{vendor.businessName}</h2>
            </div>
            {vendor.ratingAverage != null ? (
              <span className="vendor-card-rating inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/10 px-2 py-1 text-xs font-bold"><Star className="size-3 fill-gold text-gold" />{vendor.ratingAverage.toFixed(1)}</span>
            ) : null}
          </div>
          {vendor.locationCity ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-wine">{vendor.locationCity}</p> : null}
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-soft">{vendor.description}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{vendor.serviceAreas.slice(0, 2).map(humanize).join(" · ") || "Area not set"}</span>
            <span className="font-semibold text-ink">{vendor.minPriceMinor == null ? "Price on request" : `${formatIls(vendor.minPriceMinor)}${vendor.maxPriceMinor && vendor.maxPriceMinor !== vendor.minPriceMinor ? `–${formatIls(vendor.maxPriceMinor)}` : ""}${vendor.categorySlug === "venues" ? " / guest" : ""}`}</span>
          </div>
        </div>
      </Link>
      <RecommendationDetail recommendation={vendor.recommendation} />
    </article>
  );
}
