"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { IdentitySavedToast } from "@/components/couple/identity-saved-toast";
import { CoupleAvatar } from "@/components/couple/couple-avatar";
import {
  chooseCoupleAvatar,
  removeCouplePhoto,
  saveCouplePhoto,
} from "@/lib/actions/couple-identity";
import { createClient } from "@/lib/supabase/client";
import {
  avatarExtension,
  COUPLE_AVATAR_CHOICES,
  COUPLE_AVATAR_LABELS,
  validateAvatarFile,
  type CoupleAvatarChoice,
} from "@/lib/domain/couple-identity";

export const COUPLE_SETTINGS_ARTWORK: Record<CoupleAvatarChoice, string> = {
  heart: "/images/couple-settings/heart.png",
  woman_man: "/images/couple-settings/bride-and-groom.png",
  woman_woman: "/images/couple-settings/bride-and-bride.png",
  man_man: "/images/couple-settings/groom-and-groom.png",
};

async function canDecodeImage(file: File): Promise<boolean> {
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      return true;
    }
    return await new Promise<boolean>((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image.naturalWidth > 0 && image.naturalHeight > 0); };
      image.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      image.src = url;
    });
  } catch {
    return false;
  }
}

export function CoupleAvatarSettings({
  profileId,
  choice,
  storagePath,
  photoUrl,
}: {
  profileId: string;
  choice: CoupleAvatarChoice;
  storagePath: string | null;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saveRevision, setSaveRevision] = useState(0);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  function chooseIcon(nextChoice: CoupleAvatarChoice) {
    startTransition(async () => {
      const result = await chooseCoupleAvatar(nextChoice);
      setMessage(result.message);
      if (result.status === "success") { setSaveRevision(value => value + 1); router.refresh(); }
    });
  }

  function removePhoto() {
    startTransition(async () => {
      const result = await removeCouplePhoto();
      setMessage(result.message);
      if (result.status === "success") { setSaveRevision(value => value + 1); router.refresh(); }
    });
  }

  async function uploadPhoto(formData: FormData) {
    const file = formData.get("photo");
    if (!(file instanceof File)) return setMessage("Choose an image first.");
    const validationMessage = validateAvatarFile(file);
    if (validationMessage) return setMessage(validationMessage);
    if (!(await canDecodeImage(file))) return setMessage("That file is not a readable image.");
    const extension = avatarExtension(file.type);
    if (!extension) return setMessage("Use a JPEG, PNG, or WebP image.");

    setUploading(true);
    setMessage(undefined);
    const storagePath = `${profileId}/avatar-${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("couple-media").upload(storagePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      setUploading(false);
      return setMessage("The photo could not be uploaded.");
    }

    const result = await saveCouplePhoto(storagePath);
    if (result.status === "error") await supabase.storage.from("couple-media").remove([storagePath]);
    setMessage(result.message);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result.status === "success") { setSaveRevision(value => value + 1); router.refresh(); }
  }

  return (
    <section id="couple-profile" className="couple-identity-panel scroll-mt-24 ea-surface ea-surface--blush p-5 sm:p-7" aria-labelledby="couple-identity-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <CoupleAvatar choice={choice} photoUrl={photoUrl} className="size-24 sm:size-28" sizes="112px" />
        <div>
          <p className="eyebrow">Couple profile</p>
          <h2 id="couple-identity-title" className="font-display mt-1 text-3xl">Your shared identity</h2>
        </div>
      </div>

      {saveRevision > 0 ? <IdentitySavedToast key={saveRevision} /> : null}
      {message ? <p className="ea-feedback mt-5" role="status">{message}</p> : null}

      <form action={uploadPhoto} className="mt-6 grid gap-3 rounded-lg border border-dashed bg-canvas/60 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="grid min-w-0 gap-2 text-sm font-semibold">Couple photo
          <input ref={inputRef} type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="min-w-0 w-full rounded-md border bg-paper p-2 text-sm" />
          <span className="text-xs font-normal leading-5 text-ink-soft">JPEG, PNG or WebP · max 5 MB</span>
        </label>
        <button disabled={uploading || isPending} className="ea-button ea-button--primary"><ImagePlus className="size-4" />{uploading ? "Uploading…" : storagePath ? "Change photo" : "Upload photo"}</button>
      </form>

      {storagePath ? <button type="button" disabled={isPending || uploading} onClick={removePhoto} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-wine hover:border-wine"><Trash2 className="size-4" />Remove photo and use icon</button> : null}

      <fieldset className="mt-7">
        <legend className="text-sm font-semibold">Choose an icon</legend>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COUPLE_AVATAR_CHOICES.map((avatarChoice) => (
            <button key={avatarChoice} type="button" disabled={isPending || uploading} onClick={() => chooseIcon(avatarChoice)} aria-label={`Choose ${COUPLE_AVATAR_LABELS[avatarChoice]} couple icon`} aria-pressed={!storagePath && choice === avatarChoice} className={`couple-avatar-choice flex min-h-28 items-center justify-center rounded-lg border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 ${!storagePath && choice === avatarChoice ? "border-wine bg-wine/5 text-wine shadow-sm" : "bg-paper hover:border-wine"}`}>
              <span className="relative size-20 overflow-hidden rounded-md bg-white">
                <NextImage src={COUPLE_SETTINGS_ARTWORK[avatarChoice]} alt={`${COUPLE_AVATAR_LABELS[avatarChoice]} illustration`} fill sizes="80px" className="object-contain" />
              </span>
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
