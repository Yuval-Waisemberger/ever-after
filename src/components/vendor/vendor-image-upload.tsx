"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { registerVendorImage } from "@/lib/actions/vendor-profile";
import { createClient } from "@/lib/supabase/client";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function VendorImageUpload({ vendorId }: { vendorId: string }) {
  const [message, setMessage] = useState<string>();
  const [uploading, setUploading] = useState(false);

  async function upload(formData: FormData) {
    const file = formData.get("image");
    const alt = String(formData.get("alt") ?? "");
    if (!(file instanceof File) || file.size === 0) return setMessage("Choose an image first.");
    if (!allowedTypes.has(file.type)) return setMessage("Use a JPG, PNG, or WebP image.");
    if (file.size > 5 * 1024 * 1024) return setMessage("Keep images under 5 MB.");

    setUploading(true);
    setMessage(undefined);
    const extension = file.name.split(".").pop()?.toLocaleLowerCase() || "jpg";
    const storagePath = `${vendorId}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("vendor-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (error) {
      setUploading(false);
      return setMessage("The image could not be uploaded.");
    }
    try {
      await registerVendorImage(vendorId, storagePath, alt);
      setMessage("Image uploaded.");
    } catch {
      await supabase.storage.from("vendor-media").remove([storagePath]);
      setMessage("The upload could not be completed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={upload} className="grid gap-4 rounded-xl border border-dashed bg-canvas/60 p-4">
      {message ? <p className="text-sm text-ink-soft" role="status">{message}</p> : null}
      <label className="grid gap-2 text-sm font-semibold">Image<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required className="rounded-xl border bg-paper p-2 text-sm" /></label>
      <label className="grid gap-2 text-sm font-semibold">Alternative text<input name="alt" maxLength={240} placeholder="Describe the image for visitors who cannot see it" className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal" /></label>
      <button disabled={uploading} className="inline-flex min-h-11 items-center justify-center gap-2 justify-self-start rounded-full bg-wine px-5 text-sm font-semibold text-white disabled:opacity-60"><Upload className="size-4" />{uploading ? "Uploading…" : "Upload image"}</button>
    </form>
  );
}
