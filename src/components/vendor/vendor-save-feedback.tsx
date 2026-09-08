"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Check, ArrowRight } from "lucide-react";
import type { ActionState } from "@/lib/actions/state";

export function VendorSaveFeedback({ state, pending, slug }: { state: ActionState & { publishedNow?: boolean }; pending: boolean; slug?: string }) {
  const toast = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = toast.current;
    if (!element || pending || state.status !== "success") return;
    element.hidden = false;
    const timer = window.setTimeout(() => { element.hidden = true; }, 4500);
    return () => window.clearTimeout(timer);
  }, [state, pending]);
  if (pending || state.status !== "success") return null;
  return <>
    <div ref={toast} className="vendor-save-toast ea-toast" role="status"><Check className="size-5 text-wine" aria-hidden="true" /><span>Business profile saved</span><button type="button" className="ea-icon-button ml-auto" aria-label="Dismiss notification" onClick={() => { if (toast.current) toast.current.hidden = true; }}>×</button></div>
    {state.publishedNow ? <section className="vendor-publish-success ea-surface ea-surface--champagne" role="status"><span className="vendor-success-check" aria-hidden="true"><Check /></span><div><h2 className="font-display text-2xl">Your profile is live</h2><p className="mt-1 text-sm text-ink-soft">Couples can now find and contact you</p>{slug ? <Link className="ea-text-action mt-3" href={`/vendors/${slug}`}>View public profile <ArrowRight className="size-4" /></Link> : null}</div></section> : null}
  </>;
}
