"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** One scroll path over the existing Task-derived timeline. Never stores planning data. */
export function TimelinePath({ children }: { children: ReactNode }) {
  const node = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let furthest = 0;
    const measure = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      // Reading back up does not erase the path already revealed.
      furthest = Math.max(furthest, Math.min(1, Math.max(0, (innerHeight * .78 - rect.top) / Math.max(1, rect.height))));
      element.style.setProperty("--timeline-progress", String(motion?.matches ? 1 : furthest));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion?.addEventListener("change", schedule);
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(element);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); motion?.removeEventListener("change", schedule); resize?.disconnect(); };
  }, []);
  return <ol ref={node} className="planning-timeline-path">{children}</ol>;
}

export function WeddingDestinationArt() {
  return <svg className="wedding-destination-art" viewBox="0 0 100 64" fill="none" aria-hidden="true">
    <path className="destination-heart" pathLength="1" d="M50 52 28 31C12 15 35 0 50 19 65 0 88 15 72 31Z" />
    <path className="destination-spark" d="m16 35 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
    <path className="destination-spark" d="m84 7 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
    <path className="destination-spark" d="m82 43 1.5 3.5L87 48l-3.5 1.5L82 53l-1.5-3.5L77 48l3.5-1.5Z" />
  </svg>;
}
