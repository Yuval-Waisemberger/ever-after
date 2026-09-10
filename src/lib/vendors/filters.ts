import type { VendorFilters } from "./types";
import { isVendorArea } from "./location";

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function parseVendorFilters(params: Record<string, string | string[] | undefined>): VendorFilters {
  const page = Math.max(1, Math.trunc(positiveNumber(one(params.page)) ?? 1));
  const sort = one(params.sort);
  const area = one(params.area)?.trim();
  return {
    sort: one(params.category)?.trim() && (sort === "price_asc" || sort === "price_desc") ? sort : undefined,
    search: one(params.search)?.trim() || undefined,
    category: one(params.category)?.trim() || undefined,
    subcategory: one(params.subcategory)?.trim() || undefined,
    area: isVendorArea(area) ? area : undefined,
    minPrice: positiveNumber(one(params.minPrice)),
    maxPrice: positiveNumber(one(params.maxPrice)),
    minRating: positiveNumber(one(params.minRating)),
    guestCount: positiveNumber(one(params.guestCount)),
    friday: one(params.friday) === "true",
    service: one(params.service)?.trim() || undefined,
    page,
  };
}
