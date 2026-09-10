"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { registerVendorImage } from "@/lib/actions/vendor-profile";
import { createClient } from "@/lib/supabase/client";

import { MAX_VENDOR_IMAGES, vendorImageError } from "@/lib/domain/vendor-media";

export function VendorImageUpload({ vendorId, imageCount }: { vendorId: string; imageCount: number }) {
  const busy = useRef(false);
  const [message, setMessage] = useState<string>();
  const [uploading, setUploading] = useState(false);

  async function upload(formData: FormData) {
    if (busy.current || imageCount >= MAX_VENDOR_IMAGES) return;
    const file = formData.get("image");
    const alt = String(formData.get("alt") ?? "");
    if (!(file instanceof File) || file.size === 0) return setMessage("Choose an image first.");
    const validation = vendorImageError(file);
    if (validation) return setMessage(validation);
    busy.current = true;

    setUploading(true);
    setMessage(undefined);
    const extension = file.name.split(".").pop()?.toLocaleLowerCase() || "jpg";
    const storagePath = `${vendorId}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("vendor-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (error) {
      busy.current = false;
      setUploading(false);
      return setMessage("The image could not be uploaded.");
    }
    try {
      await registerVendorImage(vendorId, storagePath, alt);
      setMessage("Image uploaded.");
    } catch (error) {
      await supabase.storage.from("vendor-media").remove([storagePath]);
      setMessage(error instanceof Error ? error.message : "The upload could not be completed. Please try again.");
    } finally {
      busy.current = false;
      setUploading(false);
    }
  }

  if (imageCount >= MAX_VENDOR_IMAGES) return <p className="text-sm text-ink-soft" role="status">{imageCount > MAX_VENDOR_IMAGES ? `This gallery has ${imageCount} existing photos. No photos were removed. ` : ""}Maximum of 3 business photos reached. Remove a photo before uploading another.</p>;

  return (
    <form action={upload} className="grid gap-4 rounded-xl border border-dashed bg-canvas/60 p-4">
      {message ? <p className="text-sm text-ink-soft" role="status">{message}</p> : null}
      <label className="grid min-w-0 gap-2 text-sm font-semibold">Image<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required className="min-w-0 w-full rounded-xl border bg-paper p-2 text-sm" /></label>
      <label className="grid min-w-0 gap-2 text-sm font-semibold">Alternative text<input name="alt" maxLength={240} placeholder="Describe the image for visitors who cannot see it" className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal" /></label>
      <button disabled={uploading} className="ea-button ea-button--primary justify-self-start disabled:opacity-60"><Upload className="size-4" />{uploading ? "Uploading…" : "Upload image"}</button>
    </form>
  );
}
