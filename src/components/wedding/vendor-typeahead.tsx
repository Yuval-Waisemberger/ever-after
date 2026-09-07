"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchSetupVendors } from "@/lib/actions/setup-bookings";
import type { BookingCategory } from "@/lib/domain/booking-state";

type Vendor = Awaited<ReturnType<typeof searchSetupVendors>>["vendors"][number];
export function VendorTypeahead({ category, subcategory, disabled, onSelect }: {
  category: BookingCategory; subcategory: string; disabled: boolean; onSelect: (id: string) => void;
}) {
  const listId = useId();
  const request = useRef(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const meaningful = (query.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2;

  useEffect(() => {
    const sequence = ++request.current;
    let cancelled = false;
    if (!meaningful || !subcategory || selected || disabled) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchSetupVendors({ category, subcategory, search: query.trim(), page: 1 });
        if (cancelled || sequence !== request.current) return;
        setFailed(result.status !== "success");
        setVendors(result.status === "success" ? result.vendors.slice(0, 6) : null);
      } catch {
        if (!cancelled && sequence === request.current) { setFailed(true); setVendors(null); }
      } finally { if (!cancelled && sequence === request.current) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); cancelled = true; };
  }, [query, meaningful, category, subcategory, selected, disabled]);

  function choose(vendor: Vendor) {
    request.current++;
    setSelected(vendor); setQuery(vendor.businessName); setOpen(false); setLoading(false);
    setActive(-1); setVendors(null); onSelect(vendor.id);
  }
  const expanded = open && !selected && meaningful && !disabled;
  return <div className="min-w-0">
    <label className="grid gap-1 text-sm">Vendor name or city
      <input className="ea-input w-full min-w-0" role="combobox" autoComplete="off" dir="auto"
        aria-autocomplete="list" aria-expanded={expanded} aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 && vendors?.[active] ? `${listId}-${active}` : undefined}
        value={query} maxLength={80} disabled={disabled || !subcategory}
        onFocus={() => { if (!selected) setOpen(true); }} onBlur={() => setOpen(false)}
        onChange={event => {
          request.current++; setQuery(event.target.value); setSelected(null); onSelect("");
          setVendors(null); setFailed(false); setLoading(false); setActive(-1); setOpen(true);
        }}
        onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActive(-1); }
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && vendors?.length) {
            event.preventDefault(); setOpen(true);
            const next = event.key === "ArrowDown" ? (active + 1) % vendors.length : (active <= 0 ? vendors.length - 1 : active - 1);
            setActive(next);
            document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
          }
          if (event.key === "Enter" && expanded && active >= 0 && vendors?.[active]) {
            event.preventDefault(); choose(vendors[active]);
          }
        }} />
    </label>
    {expanded ? <div className="mt-1 rounded-xl border bg-paper shadow-sm">
      <div role="status" className="text-sm text-ink-soft">
        {loading ? <p className="p-3">Searching…</p> : failed ? <p className="p-3">Search is unavailable. Please try again.</p> : vendors?.length === 0 ? <p className="p-3">No matching vendors</p> : null}
      </div>
      <div id={listId} role="listbox" aria-label="Matching vendors" className="max-h-72 overflow-y-auto">
        {vendors?.map((vendor, index) => <button type="button" role="option" tabIndex={-1}
          id={`${listId}-${index}`} key={vendor.id} aria-selected={active === index}
          className={`block min-h-12 w-full break-words px-3 py-3 text-start hover:bg-wine/5 focus-visible:outline-2 focus-visible:outline-wine ${active === index ? "bg-wine/10 text-wine" : "text-ink"}`}
          onPointerDown={event => event.preventDefault()} onClick={() => choose(vendor)}>
          <span className="block font-semibold"><bdi>{vendor.businessName}</bdi></span>
          <span className="block text-xs text-ink-soft"><bdi>{vendor.subcategory}</bdi> · <bdi>{vendor.city ?? "City not listed"}</bdi></span>
        </button>)}
      </div>
    </div> : null}
    {selected ? <p role="status" className="mt-2 break-words text-sm text-wine">Selected: <bdi>{selected.businessName}</bdi></p> : null}
  </div>;
}
