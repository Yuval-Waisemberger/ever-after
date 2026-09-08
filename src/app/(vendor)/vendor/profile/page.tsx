import type { Metadata } from "next";
import { VendorReveal } from "@/components/vendor/vendor-motion";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { VendorProfileForm } from "@/components/vendor/vendor-profile-form";
import { VendorImageUpload } from "@/components/vendor/vendor-image-upload";
import { deleteVendorImage } from "@/lib/actions/vendor-profile";
import { getOwnedVendorProfile, getVendorTaxonomy } from "@/lib/queries/vendor-dashboard";

export const metadata: Metadata = { title: "My Business Profile" };

export default async function VendorProfilePage() {
  const [profile, taxonomy] = await Promise.all([getOwnedVendorProfile(), getVendorTaxonomy()]);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return (
    <main className="vendor-account mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Vendor" title={profile ? "My Business Profile" : "Vendor Profile Setup"} description={profile ? "The details that help couples get to know your business." : "Add your business details to create your private Vendor Profile. You can publish it when you are ready."} />
      <div className="mt-8"><VendorProfileForm profile={profile} taxonomy={taxonomy} /></div>
      {profile ? <VendorReveal className="mt-7"><section id="gallery" className="vendor-panel ea-surface ea-surface--champagne"><h2 className="font-display text-2xl">Gallery</h2><p className="mt-2 text-sm text-ink-soft">JPG, PNG, or WebP. Maximum 5 MB per image.</p><div className="mt-5"><VendorImageUpload vendorId={profile.id} /></div>{profile.vendor_images?.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{profile.vendor_images.map((image) => { const url = image.external_url ?? (image.storage_path ? `${supabaseUrl}/storage/v1/object/public/vendor-media/${image.storage_path}` : null); if (!url) return null; return <figure key={image.id} className="overflow-hidden rounded-xl border"><div className="relative aspect-[4/3]"><Image src={url} alt={image.alt_text ?? "Vendor gallery image"} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px" className="object-cover" /></div><figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-ink-soft"><span className="line-clamp-1">{image.alt_text || "No alt text"}</span><form action={deleteVendorImage}><input type="hidden" name="imageId" value={image.id} /><button aria-label="Delete image" className="text-red-700"><Trash2 className="size-3.5" /></button></form></figcaption></figure>; })}</div> : null}</section></VendorReveal> : null}
    </main>
  );
}
