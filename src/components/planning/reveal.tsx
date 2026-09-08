"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";

/** Content starts visible: unsupported APIs, no JS and reduced motion keep the final state. */
export function PlanningReveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = node.current;
    if (!element || !window.IntersectionObserver || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    element.dataset.reveal = "pending";
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { element.dataset.reveal = "shown"; observer.disconnect(); }
    }, { threshold: .08 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={node} className={`planning-reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>{children}</div>;
}
