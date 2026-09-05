import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export function RecoveryPage({ children }: { children: ReactNode }) {
  return <main className="auth-page min-h-screen bg-canvas">
    <div className="auth-brand-bar"><Wordmark /><Link href="/vendors" className="text-sm font-semibold text-wine hover:underline">Explore vendors</Link></div>
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16">{children}</div>
  </main>;
}
