"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AnimatedValue } from "@/components/planning/animated-value";
import { formatIls, type BudgetSummary } from "@/lib/domain/budget";
import "./budget-presentation.css";

export function BudgetMetrics({ summary }: { summary: BudgetSummary }) {
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
  return <section className="budget-overview mt-8" aria-label="Budget overview">
    <div className="budget-metrics grid sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value, description, tone]) => <div key={label} className={`budget-metric budget-metric--${tone}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`font-display mt-3 text-2xl ${label === "Available" && value != null && value < 0 ? "text-red-700" : "text-wine"}`}>{value == null ? formatIls(null) : <AnimatedValue value={value} format="ils" duration={1800} />}</p>
      <p className="mt-2 text-xs leading-5 text-ink-soft">{description}</p>
    </div>)}</div>
    {impactPercent != null ? <div ref={progress} className="budget-impact-progress">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-ink-soft"><span>Committed or already spent</span><span>{formatIls(summary.budgetImpactMinor)} of {formatIls(total)}</span></div>
      <div className="budget-impact-track" role="progressbar" aria-label="Budget committed or already spent" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, impactPercent))} aria-valuetext={`${formatIls(summary.budgetImpactMinor)} of ${formatIls(total)}`}>
        <span style={{ "--budget-impact": Math.min(100, Math.max(0, impactPercent)) / 100 } as CSSProperties} />
      </div>
    </div> : null}
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
