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
  const action = relationshipId ? setRelationshipSaved : setMarketplaceVendorSaved;
  return (
    <form action={action} className={compact ? "vendor-save-form" : undefined}>
      {vendorId ? <input type="hidden" name="vendorId" value={vendorId} /> : null}
      {relationshipId ? <input type="hidden" name="relationshipId" value={relationshipId} /> : null}
      <input type="hidden" name="isSaved" value={String(!isSaved)} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button aria-pressed={isSaved} aria-label={isSaved ? "Remove from Saved Vendors" : "Save vendor"} className={compact ? `vendor-save-button grid size-11 place-items-center rounded-full border backdrop-blur-sm ${isSaved ? "border-wine bg-wine text-white" : "border-white/80 bg-paper/90 text-wine hover:border-wine"}` : `inline-flex min-h-10 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold ${isSaved ? "border-wine bg-wine text-white" : "bg-paper hover:border-wine hover:text-wine"}`}>
        <Heart className={`size-4 ${isSaved ? "fill-current" : ""}`} />
        {!compact ? (isSaved ? "Saved" : "Save") : null}
      </button>
    </form>
  );
}
