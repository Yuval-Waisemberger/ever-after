"use client";

import Image from "next/image";
import { useState } from "react";
import {
  COUPLE_AVATAR_LABELS,
  type CoupleAvatarChoice,
} from "@/lib/domain/couple-identity";

function BrideFigure({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M3.5 57V25.5C3.5 11.5 9.2 4.5 16 4.5C22.8 4.5 28.5 11.5 28.5 25.5V57" opacity=".72" />
      <path d="M7.8 24.5C7.8 14.6 11 9.2 16 9.2C21 9.2 24.2 14.6 24.2 24.5C24.2 33 20.8 37.5 16 37.5C11.2 37.5 7.8 33 7.8 24.5Z" />
      <path d="M8.2 21.2C9.5 15 12.1 11.1 16.2 9.5C17.6 14.2 20.2 18.2 24 20.3" />
      <path d="M11.4 7.2C14.2 4.8 18.2 4.8 21.2 7.2" opacity=".75" />
      <path d="M3.2 57C4.4 45.9 8.6 40 16 40C23.4 40 27.6 45.9 28.8 57" />
      <path d="M8.4 43.3C11.9 43.3 14.5 44.9 16 47.4C17.5 44.9 20.1 43.3 23.6 43.3" />
    </g>
  );
}

function GroomFigure({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M7.8 21C7.8 12.8 11.1 8 16 8C20.9 8 24.2 12.8 24.2 21C24.2 30.4 20.9 35.5 16 35.5C11.1 35.5 7.8 30.4 7.8 21Z" />
      <path d="M8 18.3C8.8 10.9 12 7 17.6 7.8C21 8.2 23.2 10.7 24 14.6C20.4 14.4 16.5 12.6 13 9.9C12.6 13.5 10.7 16.3 8 18.3Z" />
      <path d="M2.8 57C4 44.6 8.3 38.5 16 38.5C23.7 38.5 28 44.6 29.2 57" />
      <path d="M7.7 41.6L13.1 53.3L16 43.1L18.9 53.3L24.3 41.6" />
      <path d="M11.9 39.4L16 43.1L20.1 39.4" />
      <path d="M12.3 42.4L16 44.8L19.7 42.4V47.1L16 44.8L12.3 47.1Z" fill="currentColor" stroke="none" />
    </g>
  );
}

function CoupleIcon({ choice }: { choice: CoupleAvatarChoice }) {
  if (choice === "heart") {
    return (
      <svg className="couple-avatar-art couple-avatar-art--heart" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-illustration="heart">
        <path d="M32 52.5C24.7 46.1 12.5 37.2 12.5 25.2C12.5 17.5 17.6 12.4 24.3 12.4C28.1 12.4 31 14.6 32 18C33 14.6 35.9 12.4 39.7 12.4C46.4 12.4 51.5 17.5 51.5 25.2C51.5 37.2 39.3 46.1 32 52.5Z" />
        <path d="M19.3 21.1C21.6 17.8 25.8 17.3 28.3 19.7" opacity=".6" />
        <path d="M35.7 44.9C38.9 42.2 42.1 39.2 44.2 35.9" opacity=".45" />
      </svg>
    );
  }
  return (
    <svg className="couple-avatar-art" viewBox="0 0 64 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-illustration={choice}>
      {choice === "woman_man" ? <><GroomFigure x={1} /><BrideFigure x={31} /></> : null}
      {choice === "woman_woman" ? <><BrideFigure x={1} /><BrideFigure x={31} /></> : null}
      {choice === "man_man" ? <><GroomFigure x={1} /><GroomFigure x={31} /></> : null}
    </svg>
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
      ) : <CoupleIcon choice={choice} />}
    </span>
  );
}
