import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { VerificationPanel } from "@/components/auth/verification-panel";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerificationPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const audience = params.audience === "couple" || params.audience === "vendor" ? params.audience : undefined;
  const issue = params.issue === "expired" || params.issue === "invalid" || params.issue === "profile" ? params.issue : undefined;
  return <main className="auth-page min-h-screen bg-canvas">
    <div className="auth-brand-bar"><Wordmark /><Link href="/vendors" className="text-sm font-semibold text-wine hover:underline">Explore vendors</Link></div>
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16"><VerificationPanel audience={audience} issue={issue} /></div>
  </main>;
}
