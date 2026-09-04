import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { VendorCard } from "@/components/vendors/vendor-card";
import { VendorFiltersForm } from "@/components/vendors/vendor-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { parseVendorFilters } from "@/lib/vendors/filters";
import { getMarketplace, getMarketplaceSubcategories } from "@/lib/queries/vendors";
import { CategoryNavigation } from "@/components/vendors/category-navigation";
import { Sprout } from "lucide-react";

export const metadata: Metadata = {
  title: "Explore Vendors",
  description: "Explore wedding venues, photographers, music, design, attire, and event services.",
};

export default async function VendorsPage({ searchParams }: PageProps<"/vendors">) {
  const params = await searchParams;
  const filters = parseVendorFilters(params);
  const [result, subcategories] = await Promise.all([getMarketplace(filters), getMarketplaceSubcategories()]);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === "string" && value && key !== "page") next.set(key, value);
    });
    next.set("page", String(page));
    return `/vendors?${next}`;
  };

  return (
    <div className="public-theme directory-page min-h-screen">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-12">
        <section className="directory-intro" aria-labelledby="directory-title">
          <Sprout className="section-flourish" size={31} strokeWidth={1} aria-hidden="true" />
          <p className="public-eyebrow">The Ever After directory</p>
          <h1 id="directory-title">Find the people behind<br className="desktop-break" /> your perfect day.</h1>
          <p className="directory-description">From beautiful venues to the finishing touches.<br className="desktop-break" /> Discover photography, music, beauty, design and event services, all in one place.</p>
        </section>
        <CategoryNavigation selected={filters.category} />
        <section id="marketplace-results" aria-label="Vendor marketplace" className="marketplace-results">
        <div className="marketplace-summary">
          <h2>Discover your people</h2>
          <p className="shrink-0 text-sm font-semibold text-ink-soft">{result.total} {result.total === 1 ? "vendor" : "vendors"}</p>
        </div>
        {result.isPreview ? <p className="marketplace-preview">You&apos;re browsing our local demo catalog. All vendor profiles and reviews are fictional.</p> : null}
        <VendorFiltersForm key={JSON.stringify(filters)} filters={filters} subcategories={subcategories} />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {result.vendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
        </div>
        {!result.vendors.length ? <div className="mt-8"><EmptyState title="No vendors match those filters" description="Try a broader area, category, service, or price range. No vendor is hidden because of your bookings." /></div> : null}
        {pageCount > 1 ? (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Marketplace pagination">
            {filters.page > 1 ? <Link href={pageHref(filters.page - 1)} className="rounded-full border bg-paper px-4 py-2 text-sm font-semibold">Previous</Link> : null}
            <span className="text-sm text-ink-soft">Page {filters.page} of {pageCount}</span>
            {filters.page < pageCount ? <Link href={pageHref(filters.page + 1)} className="rounded-full border bg-paper px-4 py-2 text-sm font-semibold">Next</Link> : null}
          </nav>
        ) : null}
        </section>
      </main>
    </div>
  );
}
