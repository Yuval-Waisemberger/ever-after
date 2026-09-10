export type VendorProfileCompletenessInput = {
  businessName?: string | null;
  description?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  locationCity?: string | null;
  locationMode?: "fixed" | "mobile" | null;
  physicalArea?: string | null;
  serviceAreas?: string[] | null;
  minPriceMinor?: number | null;
  maxPriceMinor?: number | null;
  services?: string[] | null;
  phone?: string | null;
  email?: string | null;
  imageCount?: number;
};

export function calculateVendorProfileCompletion(profile: VendorProfileCompletenessInput) {
  const checks = [
    { label: "Add your business name", complete: Boolean(profile.businessName?.trim()) },
    { label: "Write a description", complete: Boolean(profile.description?.trim()) },
    { label: "Choose a category and subcategory", complete: Boolean(profile.categoryId && profile.subcategoryId) },
    { label: "Add location details", complete: profile.locationMode === "fixed"
      ? Boolean(profile.locationCity?.trim() && profile.physicalArea)
      : Boolean(profile.serviceAreas?.length) },
    { label: "Add a price range", complete: profile.minPriceMinor != null && profile.maxPriceMinor != null },
    { label: "List your services", complete: Boolean(profile.services?.length) },
    { label: "Add contact details", complete: Boolean(profile.phone || profile.email) },
    { label: "Add at least 2 photos", complete: (profile.imageCount ?? 0) >= 2 },
  ];
  const completed = checks.filter((check) => check.complete).length;
  return {
    percentage: Math.round((completed / checks.length) * 100),
    nextSteps: checks.filter((check) => !check.complete).map((check) => check.label),
  };
}
