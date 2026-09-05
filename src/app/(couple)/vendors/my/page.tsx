import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { setVendorStatus } from "@/lib/actions/vendors";
import { formatIls } from "@/lib/domain/budget";
import { getMyVendors } from "@/lib/queries/couple-vendors";

export const metadata: Metadata = { title: "Our Vendors" };

const statuses = ["all", "booked", "considering", "contacted", "saved", "rejected"] as const;

export default async function MyVendorsPage({ searchParams }: PageProps<"/vendors/my">) {
  const params = await searchParams;
  const selected = typeof params.status === "string" ? params.status : "all";
  const relationships = await getMyVendors(selected === "all" ? undefined : selected);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Vendors" title="Our Vendors" description="Every business you save, contact, consider or book, gathered in one place." action={<LinkButton href="/vendors" tone="secondary">Explore vendors</LinkButton>} />
      {params.relationship === "updated" ? <p role="status" className="mt-5 rounded-xl border border-wine/20 bg-wine/5 px-4 py-3 text-sm text-wine">Your vendor details have been saved.</p> : null}
      <nav className="status-tabs mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filter vendor status">
        {statuses.map((status) => <Link key={status} href={status === "all" ? "/vendors/my" : `/vendors/my?status=${status}`} className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold capitalize ${selected === status ? "border-wine bg-wine text-white" : "bg-paper text-ink-soft hover:border-wine hover:text-wine"}`}>{status}</Link>)}
      </nav>
      <div className="mt-6 space-y-4">
        {relationships.map((relationship) => {
          const vendor = Array.isArray(relationship.vendor_profiles) ? relationship.vendor_profiles[0] : relationship.vendor_profiles;
          if (!vendor) return null;
          const category = Array.isArray(vendor.vendor_categories) ? vendor.vendor_categories[0] : vendor.vendor_categories;
          const subcategory = Array.isArray(vendor.vendor_subcategories) ? vendor.vendor_subcategories[0] : vendor.vendor_subcategories;
          const images = vendor.vendor_images ?? [];
          const primaryImage = images.find((image) => image.is_primary) ?? images[0];
          const imageUrl = primaryImage?.external_url ?? (primaryImage?.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-media/${primaryImage.storage_path}` : null);
          return (
            <article key={relationship.id} className="rounded-2xl border bg-paper p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-paper-muted">{imageUrl ? <Image src={imageUrl} alt={primaryImage?.alt_text ?? `${vendor.business_name} wedding work`} fill sizes="80px" className="object-cover" /> : <span className="grid h-full place-items-center font-display text-xl text-wine">{vendor.business_name.slice(0, 1)}</span>}</div>
                  <div className="min-w-0">
                  <p className="eyebrow">{subcategory?.name ?? category?.name ?? "Vendor"}</p>
                  <Link href={`/vendors/${vendor.slug}`} className="font-display mt-1 block text-3xl hover:text-wine">{vendor.business_name}</Link>
                  <p className="mt-2 text-sm capitalize text-ink-soft">Status: {relationship.status}</p>
                  </div>
                </div>
                {relationship.agreed_price_minor != null ? <p className="ea-money text-2xl text-wine">{formatIls(Number(relationship.agreed_price_minor))}</p> : null}
              </div>
              <details className="mt-5 border-t pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-wine">Edit status and booking details</summary>
                <form action={setVendorStatus} className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="detailsMode" value="true" />
                  <input type="hidden" name="vendorId" value={relationship.vendor_id} />
                  <input type="hidden" name="returnTo" value={selected === "all" ? "/vendors/my" : `/vendors/my?status=${selected}`} />
                  <label className="grid gap-2 text-sm font-semibold">Status<select name="status" defaultValue={relationship.status} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal">{statuses.filter((status) => status !== "all").map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></label>
                  <label className="grid gap-2 text-sm font-semibold">Agreed price (₪)<input name="agreedPriceShekels" type="number" min={0} defaultValue={relationship.agreed_price_minor == null ? "" : Number(relationship.agreed_price_minor) / 100} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal" /></label>
                  <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Private notes<textarea name="privateNotes" rows={3} defaultValue={relationship.private_notes ?? ""} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" /></label>
                  <button className="min-h-11 justify-self-start rounded-full bg-wine px-5 text-sm font-semibold text-white hover:bg-wine-dark">Save vendor details</button>
                </form>
              </details>
            </article>
          );
        })}
        {!relationships.length ? <EmptyState title="No vendors here yet" description="Explore the marketplace and save, contact, consider, or book a vendor. Every status remains editable." action={<LinkButton href="/vendors">Explore vendors</LinkButton>} /> : null}
      </div>
    </main>
  );
}
