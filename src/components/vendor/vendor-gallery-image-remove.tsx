"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteVendorImage } from "@/lib/actions/vendor-profile";
import { initialActionState } from "@/lib/actions/state";
import type { ActionState } from "@/lib/actions/state";

export function VendorGalleryImageRemove({ imageId }: { imageId: string }) {
  const [state, action, pending] = useActionState(
    async (_previous: ActionState, formData: FormData) => deleteVendorImage(formData),
    initialActionState,
  );

  return (
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="imageId" value={imageId} />
      <button type="submit" aria-label={pending ? "Removing image" : "Delete image"} disabled={pending} className="text-red-700 disabled:cursor-wait disabled:opacity-60">
        <Trash2 className="size-3.5" />
      </button>
      {state.status === "error" ? <span className="mt-1 block text-xs text-red-700" role="alert">{state.message}</span> : null}
    </form>
  );
}
