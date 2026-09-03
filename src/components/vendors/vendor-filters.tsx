import { Search } from "lucide-react";
import { AREAS } from "@/lib/validation/wedding";
import type { VendorFilters } from "@/lib/vendors/types";

const categories = [
  ["", "All categories"],
  ["venues", "Venues"],
  ["photography-content", "Photography & Content"],
  ["music-entertainment", "Music & Entertainment"],
  ["beauty-attire", "Beauty & Attire"],
  ["design-flowers", "Design & Flowers"],
  ["event-services", "Event Services"],
] as const;

export function VendorFiltersForm({ filters }: { filters: VendorFilters }) {
  const inputClass = "min-h-11 rounded-xl border bg-paper px-3.5 text-sm";
  return (
    <form method="get" className="paper-panel mt-7 grid gap-4 p-4 sm:p-5 lg:grid-cols-12">
      <label className="relative lg:col-span-4">
        <span className="sr-only">Search vendors</span>
        <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-soft" />
        <input name="search" defaultValue={filters.search} placeholder="Search a vendor or service" className={`${inputClass} w-full pl-10`} />
      </label>
      <select aria-label="Category" name="category" defaultValue={filters.category ?? ""} className={`${inputClass} lg:col-span-3`}>
        {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Service area" name="area" defaultValue={filters.area ?? ""} className={`${inputClass} lg:col-span-2`}>
        <option value="">All areas</option>
        {AREAS.filter(([value]) => value !== "flexible").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Minimum rating" name="minRating" defaultValue={filters.minRating ?? ""} className={`${inputClass} lg:col-span-2`}>
        <option value="">Any rating</option>
        <option value="4">4.0+</option>
        <option value="4.5">4.5+</option>
      </select>
      <button className="min-h-11 rounded-xl bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark lg:col-span-1">Apply</button>

      {filters.category === "venues" ? (
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-3 lg:col-span-12">
          <input name="guestCount" type="number" min={1} max={5000} defaultValue={filters.guestCount} placeholder="Guest count" aria-label="Guest count" className={inputClass} />
          <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-paper px-3.5 text-sm"><input type="checkbox" name="friday" value="true" defaultChecked={filters.friday} className="accent-wine" />Friday availability</label>
          <input name="maxPrice" type="number" min={0} defaultValue={filters.maxPrice} placeholder="Max price per guest (₪)" aria-label="Maximum price per guest" className={inputClass} />
        </div>
      ) : filters.category === "photography-content" ? (
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:col-span-12">
          <input name="service" defaultValue={filters.service} placeholder="Included service, e.g. Drone" aria-label="Included service" className={inputClass} />
          <input name="maxPrice" type="number" min={0} defaultValue={filters.maxPrice} placeholder="Maximum package price (₪)" aria-label="Maximum package price" className={inputClass} />
        </div>
      ) : null}
    </form>
  );
}
