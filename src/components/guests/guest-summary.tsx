"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { AnimatedValue } from "@/components/planning/animated-value";
import type { GuestSummary as Summary } from "@/lib/domain/guests";
import "./guest-presentation.css";

export function GuestSummary({ summary, estimate }: { summary: Summary; estimate: number | null }) {
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ring.current;
    if (!element || !window.IntersectionObserver) return;
    element.dataset.motion = "ready";
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { element.dataset.motion = "revealed"; observer.disconnect(); }
    }, { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const percentage = summary.invited > 0 ? Math.min(100, Math.max(0, Math.round(summary.attending / summary.invited * 100))) : null;
  const cards = [["Invited", summary.invited, "invited"], ["Attending", summary.attending, "attending"], ["Awaiting response", summary.awaitingResponse, "pending"], ["Not attending", summary.notAttending, "declined"]] as const;
  return <section className="guest-summary mt-7" aria-labelledby="guest-summary-heading">
    <div className="guest-summary-intro">
      <div><p className="eyebrow">Your people, together</p><h2 id="guest-summary-heading" className="font-display mt-2 text-2xl">Every reply brings the day closer</h2><p className="mt-2 text-sm text-ink-soft">{summary.invited ? `${summary.attending} of ${summary.invited} invited guests are attending.` : "Your invitation picture begins with your first invited guest."}</p></div>
      <div ref={ring} className="guest-attendance-ring" style={{ "--guest-progress": `${percentage ?? 0}%` } as CSSProperties} role="img" aria-label={percentage == null ? "No invited guests yet" : `${percentage}% attending: ${summary.attending} of ${summary.invited} invited guests`}>
        <div><strong className="font-display">{percentage == null ? "—" : `${percentage}%`}</strong><span>{percentage == null ? "No invites yet" : "attending"}</span></div>
      </div>
    </div>
    <div className="guest-summary-metrics">{cards.map(([label, value, tone]) => <div key={label} className={`guest-summary-metric guest-summary-metric--${tone}`}><p className="text-xs font-semibold text-ink-soft">{label}</p><p className="font-display mt-2 text-3xl text-wine"><AnimatedValue value={value} /></p></div>)}</div>
    <div className="guest-summary-context"><p><strong>{summary.notYetInvited}</strong> not yet invited</p><p>Wedding guest estimate <strong>{estimate == null ? "Not set" : `~${estimate}`}</strong></p></div>
    {estimate != null ? <p className="mt-3 text-xs leading-5 text-ink-soft">{summary.invited} invited of ~{estimate} planned guests. Your Wedding Details estimate stays separate from Guest List totals.</p> : null}
  </section>;
}
