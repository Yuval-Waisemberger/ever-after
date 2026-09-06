"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CoupleAvatar } from "@/components/couple/couple-avatar";
import type { CoupleAvatarChoice } from "@/lib/domain/couple-identity";

export function CoupleProfileMenu({
  choice,
  photoUrl,
}: {
  choice: CoupleAvatarChoice;
  photoUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function dismissWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative mx-auto inline-flex">
      <button ref={triggerRef} type="button" aria-label="Change couple profile" aria-haspopup="menu" aria-expanded={open} aria-controls="couple-profile-menu" onClick={() => setOpen((visible) => !visible)} className="rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-4 hover:scale-[1.02]">
        <CoupleAvatar choice={choice} photoUrl={photoUrl} className="size-24 sm:size-28" sizes="112px" priority />
      </button>
      {open ? (
        <div id="couple-profile-menu" role="menu" className="absolute left-1/2 top-full z-30 mt-3 w-40 -translate-x-1/2 rounded-lg border border-gold/40 bg-paper p-1.5 text-left shadow-[0_12px_30px_rgb(73_62_56_/_0.14)]">
          <Link href="/settings#couple-profile" role="menuitem" className="block rounded-md px-3 py-2.5 text-sm font-semibold text-wine outline-none hover:bg-canvas-deep focus-visible:bg-canvas-deep">Change profile</Link>
        </div>
      ) : null}
    </div>
  );
}
