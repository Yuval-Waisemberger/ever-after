"use client";

import { useEffect, useRef } from "react";
import { formatIls } from "@/lib/domain/budget";

/** Presentation only. SSR and assistive technology always receive the actual value. */
export function AnimatedValue({ value, format = "number", duration = 1500, className = "", countdown = false }: {
  value: number; format?: "number" | "ils"; duration?: number; className?: string; countdown?: boolean;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const revealed = useRef(false);
  const label = format === "ils" ? formatIls(value) : String(value);
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const text = (n: number) => format === "ils" ? formatIls(n) : String(n);
    element.textContent = text(value);
    if (revealed.current) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const finish = () => { cancelAnimationFrame(frame); element.textContent = text(value); };
    const start = () => {
      if (revealed.current) return;
      revealed.current = true;
      if (motion?.matches) return;
      const from = countdown ? Math.max(value, Math.round(value * 2)) : 0;
      const began = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - began) / duration);
        element.textContent = text(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 4))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const change = () => { if (motion?.matches) finish(); };
    motion?.addEventListener("change", change);
    if (window.IntersectionObserver) {
      observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { start(); observer?.disconnect(); } }, { threshold: .2 });
      observer.observe(element);
    } else start();
    return () => { finish(); observer?.disconnect(); motion?.removeEventListener("change", change); };
  }, [value, format, duration, countdown]);
  return <span className={`planning-value ${className}`} aria-label={label}><span ref={node} aria-hidden="true">{label}</span></span>;
}
