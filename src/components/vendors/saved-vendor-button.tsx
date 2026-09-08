"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackSettlement } from "./feedback-settlement";
import { Heart } from "lucide-react";
import { setMarketplaceVendorSaved, setRelationshipSaved } from "@/lib/actions/vendors";

export function SavedVendorButton({
  isSaved,
  returnTo,
  vendorId,
  relationshipId,
  compact = false,
}: {
  isSaved: boolean;
  returnTo: string;
  vendorId?: string;
  relationshipId?: string;
  compact?: boolean;
}) {
  const previous = useRef(isSaved), requested = useRef(false);
  const [motion, setMotion] = useState<"save" | "unsave" | null>(null);
  useEffect(() => {
    const changed = previous.current !== isSaved; previous.current = isSaved;
    if (!changed) return;
    if (!requested.current) return;
    requested.current = false;
    const frame = requestAnimationFrame(() => setMotion(isSaved ? "save" : "unsave"));
    return () => cancelAnimationFrame(frame);
  }, [isSaved]);
  const clearIntent = useCallback(() => { requested.current = false; }, []);
  const action = relationshipId ? setRelationshipSaved : setMarketplaceVendorSaved;
  return (
    <form action={action} onSubmit={() => { requested.current = true; setMotion(null); }} data-save-motion={motion ?? undefined} className={`vendor-save-feedback ${compact ? "vendor-save-form" : ""}`}>
      <FeedbackSettlement onSettled={clearIntent} />
      {vendorId ? <input type="hidden" name="vendorId" value={vendorId} /> : null}
      {relationshipId ? <input type="hidden" name="relationshipId" value={relationshipId} /> : null}
      <input type="hidden" name="isSaved" value={String(!isSaved)} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button aria-pressed={isSaved} aria-label={isSaved ? "Remove from Saved Vendors" : "Save vendor"} className={compact ? `vendor-save-button grid size-11 place-items-center rounded-full border backdrop-blur-sm ${isSaved ? "border-wine bg-wine text-white" : "border-white/80 bg-paper/90 text-wine hover:border-wine"}` : `inline-flex min-h-10 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold ${isSaved ? "border-wine bg-wine text-white" : "bg-paper hover:border-wine hover:text-wine"}`}>
        <Heart className={`size-4 ${isSaved ? "fill-current" : ""}`} />
        {motion === "save" ? <span className="save-particles" aria-hidden="true"><i /><i /><i /></span> : null}
        {!compact ? (isSaved ? "Saved" : "Save") : null}
      </button>
    </form>
  );
}
