import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { VendorCard } from "@/components/vendors/vendor-card";
import { VendorFiltersForm } from "@/components/vendors/vendor-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { parseVendorFilters } from "@/lib/vendors/filters";
import { getMarketplace } from "@/lib/queries/vendors";

export const metadata: Metadata = {
  title: "Explore Vendors",
  description: "Explore wedding venues, photographers, music, design, attire, and event services.",
};

export default async function VendorsPage({ searchParams }: PageProps<"/vendors">) {
  const params = await searchParams;
  const filters = parseVendorFilters(params);
  const result = await getMarketplace(filters);
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
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <p className="eyebrow">The wedding marketplace</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h1 className="font-display text-5xl tracking-tight sm:text-6xl">Find the right people.</h1><p className="mt-3 max-w-2xl leading-7 text-ink-soft">Browse every category freely. Personalization helps you notice a fit; it never limits what you can explore.</p></div>
          <p className="shrink-0 text-sm font-semibold text-ink-soft">{result.total} {result.total === 1 ? "vendor" : "vendors"}</p>
        </div>
        {result.isPreview ? <p className="mt-5 rounded-xl border border-gold/30 bg-[#f3ead7] px-4 py-3 text-sm text-ink-soft">Preview catalog — connect the existing Supabase project to load the live marketplace.</p> : null}
        <VendorFiltersForm filters={filters} />
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
      </main>
    </div>
  );
}
