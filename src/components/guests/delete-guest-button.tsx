"use client";

import { Trash2 } from "lucide-react";
import { deleteGuest } from "@/lib/actions/guests";

export function DeleteGuestButton({ id, name, compact = false }: { id: string; name: string; compact?: boolean }) {
  return (
    <form action={deleteGuest} onSubmit={(event) => { if (!window.confirm(`Delete ${name} from your Guest List?`)) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className={compact ? "grid size-10 place-items-center rounded-full border bg-paper text-red-700 hover:border-red-700" : "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold text-red-700 hover:border-red-700"} aria-label={`Delete ${name}`}>
        <Trash2 className="size-4" aria-hidden="true" />{compact ? null : "Delete"}
      </button>
    </form>
  );
}
