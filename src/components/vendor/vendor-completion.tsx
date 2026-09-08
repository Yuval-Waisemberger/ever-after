"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Building2, FileText, Tags, MapPin, Banknote, ListChecks, Phone, Images, Check, ArrowUpRight, Sparkles } from "lucide-react";
import { VendorNumber } from "./vendor-motion";

const steps = [
  { label: "Add your business name", target: "businessName", icon: Building2 },
  { label: "Write a description", target: "description", icon: FileText },
  { label: "Choose a category and subcategory", target: "categoryChoice", icon: Tags },
  { label: "Add service areas", target: "service-areas", icon: MapPin },
  { label: "Add a price range", target: "pricing", icon: Banknote },
  { label: "List your services", target: "services", icon: ListChecks },
  { label: "Add contact details", target: "contact", icon: Phone },
  { label: "Add at least 3 photos", target: "gallery", icon: Images },
];
// In-memory visual comparison across App Router visits, never persisted or used as profile truth.
const lastSeen = new Map<string, string[]>();
export function VendorCompletion({ profileId, percentage, nextSteps, imageCount }: { profileId: string; percentage: number; nextSteps: string[]; imageCount: number }) {
  const node = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = lastSeen.get(profileId);
    const element = node.current;
    element?.querySelectorAll<HTMLElement>("[data-step]").forEach(item => {
      const label = item.dataset.step!;
      item.dataset.justCompleted = String(Boolean(previous?.includes(label) && !nextSteps.includes(label)));
    });
    lastSeen.set(profileId, [...nextSteps]);
    return () => { element?.querySelectorAll<HTMLElement>("[data-step]").forEach(item => { item.dataset.justCompleted = "false"; }); };
  }, [profileId, nextSteps]);
  return <section ref={node} className="vendor-panel vendor-completion ea-surface ea-surface--blush" aria-labelledby="completion-title">
    <div className="flex flex-wrap items-baseline justify-between gap-3"><div><p id="completion-title" className="eyebrow">Profile completion</p><h2 className="mt-3 font-display text-4xl text-wine"><VendorNumber value={percentage} />% <span className="text-2xl text-ink">complete</span></h2></div><span className="text-xs text-ink-soft">{imageCount} {imageCount === 1 ? "photo" : "photos"}</span></div>
    <div className="vendor-progress" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{ width: `${percentage}%` }} /></div>
    <ul className="vendor-checklist">{steps.map(({ label, target, icon: Icon }) => { const complete = !nextSteps.includes(label); return <li key={label} data-step={label} data-complete={complete}><Link href={`/vendor/profile#${target}`}><span className="vendor-check" aria-hidden="true">{complete ? <Check /> : <Icon />}</span><span className="vendor-check-label">{label}</span><span className="sr-only">{complete ? " — complete, edit" : " — add details"}</span><ArrowUpRight className="ml-auto size-3.5 shrink-0 opacity-50" aria-hidden="true" /></Link></li>; })}</ul>
    {percentage >= 50 ? <p className="vendor-milestone"><Sparkles className="size-4" aria-hidden="true" />{percentage === 100 ? "Your profile is ready to shine ✦" : percentage >= 75 ? "The finishing touches are within reach." : "Halfway there. Your business is taking shape."}</p> : null}
  </section>;
}
