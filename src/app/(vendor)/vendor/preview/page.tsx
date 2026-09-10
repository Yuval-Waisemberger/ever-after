import "./preview.css";
import { notFound } from "next/navigation";
import { VendorProfilePresentation } from "@/components/vendors/vendor-profile-presentation";
import { getOwnedVendorPreview } from "@/lib/queries/vendors";

export const metadata = { title: "Preview your business profile", robots: { index: false, follow: false } };

export default async function VendorPreviewPage() {
  const vendor = await getOwnedVendorPreview();
  if (!vendor) notFound();
  return <VendorProfilePresentation vendor={vendor} ownerPreview />;
}
