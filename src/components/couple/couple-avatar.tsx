"use client";

import Image from "next/image";
import { useState } from "react";
import {
  COUPLE_AVATAR_ARTWORK,
  COUPLE_AVATAR_LABELS,
  type CoupleAvatarChoice,
} from "@/lib/domain/couple-identity";

function CoupleIcon({ choice, sizes }: { choice: CoupleAvatarChoice; sizes: string }) {
  return (
    <span className={`couple-avatar-art relative ${choice === "heart" ? "couple-avatar-art--heart" : ""}`} aria-hidden="true" data-illustration={choice}>
      <Image src={COUPLE_AVATAR_ARTWORK[choice]} alt="" fill sizes={sizes} unoptimized className="object-contain" />
    </span>
  );
}

export function CoupleAvatar({
  choice,
  photoUrl,
  className = "",
  sizes = "96px",
  priority = false,
}: {
  choice: CoupleAvatarChoice;
  photoUrl?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const showPhoto = Boolean(photoUrl) && failedPhotoUrl !== photoUrl;
  const label = showPhoto ? "Couple photo" : `${COUPLE_AVATAR_LABELS[choice]} Couple icon`;

  return (
    <span className={`couple-avatar relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-gold/50 bg-paper text-wine ${className}`} role="img" aria-label={label} data-avatar-source={showPhoto ? "photo" : "icon"} data-avatar-choice={choice}>
      {showPhoto ? (
        <Image src={photoUrl!} alt="" fill sizes={sizes} priority={priority} unoptimized className="object-cover" onError={() => setFailedPhotoUrl(photoUrl ?? null)} />
      ) : <CoupleIcon choice={choice} sizes={sizes} />}
    </span>
  );
}
