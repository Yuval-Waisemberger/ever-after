"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Visible SSR/fallback content; observers only stage finite presentation motion. */
export function VendorReveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = node.current;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!element || !window.IntersectionObserver || media?.matches) return;
    element.dataset.enter = "pending";
    const finish = () => { element.dataset.enter = "shown"; observer.disconnect(); };
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) finish(); }, { threshold: .05 });
    const change = () => { if (media?.matches) finish(); };
    observer.observe(element);
    element.addEventListener("focusin", finish);
    media?.addEventListener("change", change);
    return () => { observer.disconnect(); element.removeEventListener("focusin", finish); media?.removeEventListener("change", change); };
  }, []);
  return <div ref={node} className={`vendor-reveal ${className}`} style={{ "--vendor-delay": `${delay}ms` } as CSSProperties}>{children}</div>;
}

export function VendorNumber({ value, decimals = 0, duration = 1700 }: { value: number; decimals?: number; duration?: number }) {
  const node = useRef<HTMLSpanElement>(null), seen = useRef(false);
  const label = value.toFixed(decimals);
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    element.textContent = label;
    if (seen.current) return;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const finish = () => { cancelAnimationFrame(frame); element.textContent = label; };
    const start = () => {
      if (seen.current) return;
      seen.current = true;
      if (media?.matches) return;
      const began = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - began) / duration);
        element.textContent = (value * (1 - (1 - progress) ** 4)).toFixed(decimals);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = window.IntersectionObserver ? new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { start(); observer?.disconnect(); } }, { threshold: .2 }) : null;
    const change = () => { if (media?.matches) finish(); };
    if (observer) observer.observe(element); else start();
    media?.addEventListener("change", change);
    return () => { finish(); observer?.disconnect(); media?.removeEventListener("change", change); };
  }, [value, label, decimals, duration]);
  return <span className="tabular-nums" aria-label={label}><span ref={node} aria-hidden="true">{label}</span></span>;
}

export function VendorStars({ rating }: { rating: number }) {
  return <span className="vendor-stars" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <span key={index} className="vendor-star" aria-hidden="true" style={{ "--star-delay": `${index * 100}ms` } as CSSProperties}><svg viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1Z" /></svg><span className="vendor-star-fill" style={{ width: `${Math.min(1, Math.max(0, rating - index)) * 100}%` }}><svg viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1Z" /></svg></span></span>)}</span>;
}
