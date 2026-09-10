"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { vendorImageError } from "@/lib/domain/vendor-media";
import { saveVendorProfileImage, removeVendorProfileImage } from "@/lib/actions/vendor-identity";

export function VendorProfileImage({ vendorId, photoUrl, businessName }: { vendorId: string; photoUrl: string | null; businessName: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  async function save(remove: boolean) {
    if (busy.current) return;
    if (!remove && !file) { setMessage("Choose an image first."); return; }
    busy.current = true;
    setPending(true);
    setMessage(undefined);
    try {
      if (!remove && file) {
        const invalid = vendorImageError(file);
        if (invalid) { setMessage(invalid); return; }
        const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
        const path = `${vendorId}/profile/${crypto.randomUUID()}.${extension}`;
        const storage = createClient().storage.from("vendor-media");
        const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
        if (error) { setMessage("The image could not be uploaded. Please try again."); return; }
        const result = await saveVendorProfileImage(path);
        setMessage(result.message);
        if (result.status !== "success") return;
      } else {
        const result = await removeVendorProfileImage();
        setMessage(result.message);
        if (result.status !== "success") return;
      }
      setFile(null);
      setPreview(null);
      if (input.current) input.current.value = "";
    } catch {
      // An interrupted response may have committed. Never delete a possibly saved image.
      setMessage("The result could not be confirmed. Refresh to check your saved image before retrying.");
    } finally { busy.current = false; setPending(false); }
  }

  return <section id="profile-image" className="vendor-panel ea-surface mt-7">
    <h2 className="font-display text-2xl">Profile image</h2>
    <p className="mt-2 text-sm text-ink-soft">Your identity image or logo. Separate from your 3 business-photo slots. JPG, PNG, or WebP, up to 5 MB.</p>
    <div className="mt-5 flex flex-wrap items-start gap-5">
      {preview || photoUrl ? <Image src={preview || photoUrl!} alt={preview ? "Selected profile image preview" : `${businessName} profile image`} width={96} height={96} unoptimized={Boolean(preview)} className="size-24 rounded-full object-cover" /> : <span className="grid size-24 place-items-center rounded-full bg-wine/10 text-wine" aria-label="No profile image"><Building2 className="size-8" /></span>}
      <form action={() => save(false)} className="grid min-w-0 flex-1 gap-4" aria-busy={pending}>
        <label className="grid gap-2 text-sm font-semibold">Choose profile image<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} className="w-full min-w-0 rounded-xl border bg-paper p-2" onChange={event => {
          const selected = event.target.files?.[0] ?? null;
          const error = selected ? vendorImageError(selected) : null;
          setMessage(error ?? undefined); setFile(error ? null : selected);
          setPreview(selected && !error ? URL.createObjectURL(selected) : null);
        }} /></label>
        <div className="flex flex-wrap gap-3"><button disabled={pending || !file} className="ea-button ea-button--primary disabled:opacity-60"><Upload className="size-4" />{pending ? "Saving…" : photoUrl ? "Replace profile image" : "Upload profile image"}</button>{photoUrl ? <button type="button" disabled={pending} className="ea-button ea-button--secondary" onClick={() => save(true)}>Remove profile image</button> : null}</div>
        {message ? <p role="status" className="text-sm text-ink-soft">{message}</p> : null}
      </form>
    </div>
  </section>;
}
