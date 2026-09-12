import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LandingNavigation } from "@/components/public/landing-navigation";
import "@/app/public-auth.css";

export function RecoveryPage({ children, publicNavigation = false, authAudience = "couple" }: { children: ReactNode; publicNavigation?: boolean; authAudience?: "couple" | "vendor" }) {
  return <main id="main-content" className="auth-page min-h-screen bg-canvas">
    {publicNavigation ? <LandingNavigation context="auth" authAudience={authAudience} /> : <div className="auth-brand-bar"><Wordmark /><Link href="/vendors" className="text-sm font-semibold text-wine hover:underline">Explore vendors</Link></div>}
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16">{children}</div>
  </main>;
}
