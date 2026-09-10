"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { AnimatedValue } from "@/components/planning/animated-value";
import { formatIls, type BudgetSummary } from "@/lib/domain/budget";
import "./budget-presentation.css";

export function BudgetMetrics({ summary, totalBudgetEditor }: { summary: BudgetSummary; totalBudgetEditor?: ReactNode }) {
  const gradientId = useId();
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = progress.current;
    if (!element || !window.IntersectionObserver) return;
    element.dataset.motion = "ready";
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { element.dataset.motion = "revealed"; observer.disconnect(); }
    }, { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const metrics = [
    ["Total budget", summary.totalBudgetMinor, "Your overall spending limit", "total"],
    ["Estimated", summary.projectedMinor, "Current expected cost", "estimated"],
    ["Committed", summary.committedMinor, "Prices you have agreed to pay", "committed"],
    ["Paid", summary.paidMinor, "Money already paid", "paid"],
    ["Available", summary.availableMinor, "Funds after commitments and actual spending", "available"],
  ] as const;
  const total = summary.totalBudgetMinor;
  const impactPercent = total != null && total > 0 ? summary.budgetImpactMinor / total * 100 : null;
  const availablePercent = total != null && total > 0 && summary.availableMinor != null ? Math.round(summary.availableMinor / total * 100) : null;
  const metric = ([label, value, description, tone]: typeof metrics[number]) => <div key={label} className={`budget-metric budget-metric--${tone}`}>
    <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</p>
    <p className={`font-display mt-3 text-2xl ${label === "Available" && value != null && value < 0 ? "text-red-700" : "text-wine"}`}>{value == null ? formatIls(null) : <AnimatedValue value={value} format="ils" duration={1800} />}</p>
    <p className="mt-2 text-xs leading-5 text-ink-soft">{description}</p>
  </div>;
  return <section className="budget-overview mt-8" aria-label="Budget overview">
    <div className="budget-total-card">{metric(metrics[0])}{totalBudgetEditor ? <details className="budget-total-editor"><summary>Edit</summary><div className="mt-4">{totalBudgetEditor}</div></details> : null}</div>
    <div className="budget-summary-card">
    <div className="budget-summary-top">
      <div className="budget-summary-ring" role="img" aria-label={availablePercent == null ? "Budget percentage unavailable" : `${availablePercent}% of total budget available`}>
        <svg viewBox="0 0 140 140" aria-hidden="true"><defs><linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="131" y1="70" x2="9" y2="70"><stop offset="0%" stopColor="#733343" /><stop offset="50%" stopColor="#b77983" /><stop offset="100%" stopColor="#c8a475" /></linearGradient></defs><circle cx="70" cy="70" r="61" fill="none" stroke="#dfd9d3" strokeWidth="9" /><circle cx="70" cy="70" r="61" fill="none" stroke={`url(#${gradientId})`} strokeWidth="9" pathLength="100" strokeDasharray={`${Math.min(100, Math.max(0, availablePercent ?? 0))} 100`} transform="rotate(-90 70 70)" strokeLinecap="round" /></svg>
        <span><strong>{availablePercent == null ? "—" : `${availablePercent}%`}</strong><small>Available</small></span>
      </div>
      <div className="budget-metrics">{metrics.slice(1).map(metric)}</div>
    </div>
    {impactPercent != null ? <div ref={progress} className="budget-impact-progress">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-ink-soft"><span>Committed or already spent</span><span>{formatIls(summary.budgetImpactMinor)} of {formatIls(total)}</span></div>
      <div className="budget-impact-track" role="progressbar" aria-label="Budget committed or already spent" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, impactPercent))} aria-valuetext={`${formatIls(summary.budgetImpactMinor)} of ${formatIls(total)}`}>
        <span style={{ "--budget-impact": Math.min(100, Math.max(0, impactPercent)) / 100 } as CSSProperties} />
      </div>
    </div> : null}
    </div>
  </section>;
}

/** Only a newly received canonical value can signal sync; initial data is not a success event. */
export function BudgetExpenseSurface({ canonical, committedMinor, children }: { canonical: boolean; committedMinor: number | null; children: ReactNode }) {
  const surface = useRef<HTMLElement>(null);
  const previous = useRef(committedMinor);
  useEffect(() => {
    const changed = previous.current !== committedMinor;
    previous.current = committedMinor;
    if (!canonical || !changed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = surface.current;
    if (!element?.animate) return;
    const blush = getComputedStyle(element).getPropertyValue("--blush").trim();
    const animation = element.animate([{ backgroundColor: "transparent" }, { backgroundColor: blush, offset: 0.45 }, { backgroundColor: "transparent" }], { duration: 1200, easing: "ease-in-out" });
    return () => animation.cancel();
  }, [canonical, committedMinor]);
  return <article ref={surface} className="budget-expense-surface rounded-2xl border p-5 sm:p-6">{children}</article>;
}
