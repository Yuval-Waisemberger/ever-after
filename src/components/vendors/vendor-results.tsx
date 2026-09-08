"use client";
import { useState, type ReactNode } from "react";
import { LayoutGrid, Rows2 } from "lucide-react";

export function VendorResults({ children }: { children: ReactNode }) {
  const [density, setDensity] = useState("comfortable");
  return <>
    <div className="marketplace-display"><p className="text-xs text-ink-soft">Find your fit. Save your favourites.</p><div className="marketplace-density" role="group" aria-label="Vendor layout">
      <button type="button" aria-label="Comfortable cards" aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")}><Rows2 size={18} /></button>
      <button type="button" aria-label="Compact grid" aria-pressed={density === "compact"} onClick={() => setDensity("compact")}><LayoutGrid size={18} /></button>
    </div></div>
    <div className="marketplace-grid" data-density={density}>{children}</div>
  </>;
}
