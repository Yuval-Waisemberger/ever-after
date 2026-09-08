import type { RecommendationResult } from "@/lib/domain/recommendation";
import type { VendorLifecycleStatus } from "@/lib/domain/couple-vendors";

export type VendorReview = {
  id: string;
  reviewerDisplayName: string;
  professionalism: number;
  punctuality: number;
  serviceAttitude: number;
  valueForMoney: number;
  wouldChooseAgain: boolean;
  reviewText: string | null;
  createdAt: string;
};

export type MarketplaceVendor = {
  id: string;
  slug: string;
  businessName: string;
  description: string | null;
  categorySlug: string;
  categoryName: string;
  subcategorySlug: string | null;
  subcategoryName: string | null;
  locationCity: string | null;
  serviceAreas: string[];
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
  services: string[];
  styles: string[];
  eventTypes: string[];
  minGuestCapacity: number | null;
  maxGuestCapacity: number | null;
  fridayAvailable: boolean | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  imageUrl: string | null;
  imageAlt: string;
  gallery: Array<{ id: string; url: string; alt: string }>;
  ratingAverage: number | null;
  reviewCount: number;
  reviews: VendorReview[];
  recommendation?: RecommendationResult | null;
  isSaved?: boolean;
  lifecycleStatus?: VendorLifecycleStatus | null;
};

export type VendorFilters = {
  sort?: "name" | "price_asc" | "price_desc";
  search?: string;
  category?: string;
  subcategory?: string;
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  guestCount?: number;
  friday?: boolean;
  service?: string;
  page: number;
};
export type MarketplaceSubcategory = { slug: string; name: string; categorySlug: string };
