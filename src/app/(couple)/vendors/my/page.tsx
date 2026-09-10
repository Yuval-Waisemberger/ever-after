import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "@/app/marketplace-polish.css";
import { ExternalVendorDialog } from "@/components/vendors/external-vendor-dialog";
import { FeedbackSettlement } from "@/components/vendors/feedback-settlement";
import { BookingFeedback } from "@/components/vendors/booking-celebration";
import { ExternalVendorForm, type ExternalVendorFormValue } from "@/components/vendors/external-vendor-form";
import { SavedVendorButton } from "@/components/vendors/saved-vendor-button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { setVendorStatus } from "@/lib/actions/vendors";
import { lifecycleFromStoredStatus } from "@/lib/domain/couple-vendors";
import { formatIls } from "@/lib/domain/budget";
import { getCoupleVendorTaxonomy, getMyVendors } from "@/lib/queries/couple-vendors";

export const metadata: Metadata = { title: "Our Vendors" };

const filters = ["all", "saved", "booked", "considering", "contacted", "rejected"] as const;
const lifecycleOptions = [
  ["saved", "None"],
  ["contacted", "Contacted"],
  ["considering", "Considering"],
  ["booked", "Booked"],
  ["rejected", "Rejected"],
] as const;

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function MyVendorsPage({ searchParams }: PageProps<"/vendors/my">) {
  const params = await searchParams;
  const selected = typeof params.status === "string" && filters.includes(params.status as (typeof filters)[number]) ? params.status : "all";
  const [relationships, taxonomy] = await Promise.all([
    getMyVendors(selected === "all" ? undefined : selected),
    getCoupleVendorTaxonomy(),
  ]);
  const returnTo = selected === "all" ? "/vendors/my" : `/vendors/my?status=${selected}`;

  return (
    <main className="ea-consistent-page our-vendors-page mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Vendors" title="Our Vendors" description="Bookmarks and relationship stages live side by side, including private vendors you add yourself." action={<div className="flex flex-wrap gap-2"><LinkButton href="/vendors" tone="secondary">Explore vendors</LinkButton><ExternalVendorDialog taxonomy={taxonomy} /></div>} />
      {params.relationship === "error" ? <p role="alert" className="ea-feedback ea-feedback--error mt-5">The vendor change and budget could not be saved. Please try again.</p> : null}
      {params.relationship === "financial-history" ? <p role="alert" className="ea-feedback ea-feedback--error mt-5">This vendor could not be deleted. If it has financial history, change its lifecycle instead; payments must be preserved.</p> : null}
      {params.relationship === "updated" ? <p role="status" className="ea-feedback ea-feedback--success mt-5">Your vendor details have been saved.</p> : null}

      <nav className="status-tabs mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filter vendor status">
        {filters.map((filter) => <Link key={filter} href={filter === "all" ? "/vendors/my" : `/vendors/my?status=${filter}`} className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold capitalize ${selected === filter ? "border-wine bg-wine text-white" : "bg-paper text-ink-soft hover:border-wine hover:text-wine"}`}>{filter}</Link>)}
      </nav>

      <div className="mt-6 space-y-4">
        {relationships.map((relationship) => {
          const vendor = one(relationship.vendor_profiles);
          const external = one(relationship.external_vendors);
          if (!vendor && !external) return null;
          const isExternal = Boolean(external);
          const category = one((external ?? vendor)?.vendor_categories ?? null);
          const subcategory = one((external ?? vendor)?.vendor_subcategories ?? null);
          const images = vendor?.vendor_images ?? [];
          const primaryImage = images.find((image) => image.is_primary) ?? images[0];
          const imageUrl = primaryImage?.external_url ?? (primaryImage?.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-media/${primaryImage.storage_path}` : null);
          const businessName = external?.business_name ?? vendor?.business_name ?? "Wedding vendor";
          const lifecycle = lifecycleFromStoredStatus(relationship.status);
          const externalValue: ExternalVendorFormValue | null = external ? {
            id: external.id,
            relationshipId: relationship.id,
            businessName: external.business_name,
            contactName: external.contact_name,
            phone: external.phone,
            email: external.email,
            websiteUrl: external.website_url,
            notes: external.notes,
            categoryId: external.category_id,
            subcategoryId: external.subcategory_id,
            lifecycleStatus: lifecycle ?? "none",
            isSaved: relationship.is_saved,
            agreedPriceShekels: relationship.agreed_price_minor == null ? null : Number(relationship.agreed_price_minor) / 100,
          } : null;

          return (
            <BookingFeedback key={relationship.id} status={relationship.status} businessName={businessName}><article className="our-vendor-card rounded-2xl border bg-paper p-5 sm:p-6" data-vendor-source={isExternal ? "external" : "marketplace"}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-paper-muted font-display text-2xl text-wine">{imageUrl ? <Image src={imageUrl} alt={primaryImage?.alt_text ?? `${businessName} wedding work`} fill sizes="80px" className="object-cover" /> : businessName.slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="eyebrow">{subcategory?.name ?? category?.name ?? "Wedding vendor"}</p>{isExternal ? <span className="rounded-full border border-gold/50 bg-[#F8F1E6] px-2 py-1 text-[0.65rem] font-semibold text-wine">Added by you</span> : null}</div>
                    {vendor ? <Link href={`/vendors/${vendor.slug}`} className="font-display mt-1 block text-3xl hover:text-wine">{businessName}</Link> : <h2 className="font-display mt-1 text-3xl">{businessName}</h2>}
                    {lifecycle ? <p className="mt-2 text-sm text-ink-soft">Status: {lifecycleOptions.find(([status]) => status === lifecycle)?.[1]}</p> : null}
                    <div className="mt-3"><SavedVendorButton relationshipId={relationship.id} isSaved={relationship.is_saved === true} returnTo={returnTo} /></div>
                  </div>
                </div>
                {relationship.agreed_price_minor != null ? <p className="ea-money text-2xl text-wine">{formatIls(Number(relationship.agreed_price_minor))}</p> : null}
              </div>

              <details className="mt-5 border-t pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-wine">{isExternal ? "Edit external vendor" : "Edit status and booking details"}</summary>
                <div className="mt-5">
                  {externalValue ? <ExternalVendorForm taxonomy={taxonomy} value={externalValue} /> : (
                    <form action={setVendorStatus} className="grid gap-4 sm:grid-cols-2"><FeedbackSettlement />
                      <input type="hidden" name="detailsMode" value="true" /><input type="hidden" name="vendorId" value={relationship.vendor_id ?? ""} /><input type="hidden" name="returnTo" value={returnTo} />
                      <label className="grid gap-2 text-sm font-semibold">Relationship status<select name="status" defaultValue={relationship.status} className="min-h-11 rounded-md border bg-paper px-3.5 text-base font-normal">{lifecycleOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label>
                      <label className="grid gap-2 text-sm font-semibold">Agreed price (₪)<input name="agreedPriceShekels" type="number" min={0} defaultValue={relationship.agreed_price_minor == null ? "" : Number(relationship.agreed_price_minor) / 100} className="min-h-11 rounded-md border bg-paper px-3.5 text-base font-normal" /></label>
                      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Private notes<textarea name="privateNotes" rows={3} defaultValue={relationship.private_notes ?? ""} className="rounded-md border bg-paper px-3.5 py-3 text-base font-normal" /></label>
                      <button className="ea-button ea-button--primary justify-self-start">Save vendor details</button>
                    </form>
                  )}
                </div>
              </details>
            </article></BookingFeedback>
          );
        })}
        {!relationships.length ? <EmptyState title="No vendors here yet" description={selected === "saved" ? "Save a Marketplace vendor or an external vendor to build your shortlist." : "Explore the Marketplace or add a private external vendor. Bookmarks and lifecycle status stay independent."} action={<LinkButton href="/vendors">Explore vendors</LinkButton>} /> : null}
      </div>
    </main>
  );
}
