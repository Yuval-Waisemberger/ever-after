"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";

/** Content starts visible: unsupported APIs, no JS and reduced motion keep the final state. */
export function PlanningReveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = node.current;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!element || !window.IntersectionObserver || motion?.matches) return;
    element.dataset.reveal = "pending";
    const finish = () => { element.dataset.reveal = "shown"; observer.disconnect(); };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) finish();
    }, { threshold: .08 });
    const change = () => { if (motion?.matches) finish(); };
    observer.observe(element);
    element.addEventListener("focusin", finish);
    motion?.addEventListener("change", change);
    return () => { observer.disconnect(); element.removeEventListener("focusin", finish); motion?.removeEventListener("change", change); };
  }, []);
  return <div ref={node} className={`planning-reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>{children}</div>;
}
