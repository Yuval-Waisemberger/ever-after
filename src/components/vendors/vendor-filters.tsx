"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { AREAS } from "@/lib/validation/wedding";
import type { MarketplaceSubcategory, VendorFilters } from "@/lib/vendors/types";

export function VendorFiltersForm({ filters, subcategories }: { filters: VendorFilters; subcategories: MarketplaceSubcategory[] }) {
  const category = filters.category ?? "";
  const [subcategory, setSubcategory] = useState(filters.subcategory ?? "");
  const choices = subcategories.filter((choice) => !category || choice.categorySlug === category);
  const inputClass = "min-h-11 min-w-0 w-full rounded-xl border bg-paper px-3.5 text-sm";
  return (
    <form method="get" className="marketplace-filters paper-panel mt-7 grid gap-4 p-4 sm:p-5 lg:grid-cols-12">
      <label className="relative lg:col-span-5">
        <span className="sr-only">Search vendors</span>
        <Search className="vendor-search-icon pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <input name="search" defaultValue={filters.search} placeholder="Search a vendor or service" className={`${inputClass} vendor-search-input w-full`} />
      </label>
      <input type="hidden" name="category" value={category} />
      <select aria-label="Service area" name="area" defaultValue={filters.area ?? ""} className={`${inputClass} lg:col-span-3`}>
        <option value="">All areas</option>
        {AREAS.filter(([value]) => value !== "flexible").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Minimum rating" name="minRating" defaultValue={filters.minRating ?? ""} className={`${inputClass} lg:col-span-3`}>
        <option value="">Any rating</option>
        <option value="4">4.0+</option>
        <option value="4.5">4.5+</option>
      </select>
      <select aria-label="Subcategory" name="subcategory" value={subcategory} onChange={(event) => setSubcategory(event.target.value)} className={`${inputClass} lg:col-span-6`}>
        <option value="">All subcategories</option>
        {choices.map((choice) => <option key={choice.slug} value={choice.slug}>{choice.name}</option>)}
      </select>
      {filters.sort && filters.sort !== "name" ? <input type="hidden" name="sort" value={filters.sort} /> : null}

      {category === "venues" ? (
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-3 lg:col-span-12">
          <input name="guestCount" type="number" min={1} max={5000} defaultValue={filters.guestCount} placeholder="Guest count" aria-label="Guest count" className={inputClass} />
          <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-paper px-3.5 text-sm"><input type="checkbox" name="friday" value="true" defaultChecked={filters.friday} className="accent-wine" />Friday availability</label>
          <input name="maxPrice" type="number" min={0} defaultValue={filters.maxPrice} placeholder="Max price per guest (₪)" aria-label="Maximum price per guest" className={inputClass} />
        </div>
      ) : category === "photography-content" ? (
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:col-span-12">
          <input name="service" defaultValue={filters.service} placeholder="Exact included service, e.g. Drone" aria-label="Included service" className={inputClass} />
          <input name="maxPrice" type="number" min={0} defaultValue={filters.maxPrice} placeholder="Maximum package price (₪)" aria-label="Maximum package price" className={inputClass} />
        </div>
      ) : null}
      <button className="marketplace-filter-submit min-h-11 rounded-xl bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark lg:col-span-2 lg:col-start-11">Apply</button>
    </form>
  );
}
