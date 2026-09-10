import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVendorBySlug } from "@/lib/queries/vendors";
import { VendorProfilePresentation } from "@/components/vendors/vendor-profile-presentation";

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
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();
  return <VendorProfilePresentation vendor={vendor} query={await searchParams} />;
}
