"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-11 items-center justify-center rounded-full border border-wine bg-wine px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-wine-dark disabled:cursor-wait disabled:opacity-65 ${className}`}
      {...props}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
