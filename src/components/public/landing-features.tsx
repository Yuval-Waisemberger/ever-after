"use client";

import { useEffect, useRef, useState } from "react";
import { Sprout } from "lucide-react";

const features = [
  { kind: "plan", title: "Plan with ease", copy: "Tasks, timeline and wedding details in one place." },
  { kind: "vendors", title: "Find the perfect vendors", copy: "Discover wedding vendors that fit your style, location and budget." },
  { kind: "budget", title: "Stay on track", copy: "Track budget, payments and important deadlines." },
  { kind: "assistant", title: "AI Wedding Assistant", copy: "Get personalized planning guidance based on your wedding context." },
];

function FeatureIcon({ kind }: { kind: string }) {
  return <svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "plan" ? <>
      <path className="feature-outline" pathLength="1" d="M15 8H9v28h22V8h-6M16 5h8v7h-8z" />
      <path className="feature-detail feature-check" pathLength="1" d="m14 20 3 3 6-6" />
      <path className="feature-detail feature-check feature-check--two" pathLength="1" d="m14 29 3 3 6-6" />
    </> : kind === "vendors" ? <path className="feature-outline feature-heart" pathLength="1" d="M20 34 6 20C-4 9 11-1 20 11 29-1 44 9 34 20Z" /> : kind === "budget" ? <>
      <path className="feature-outline" pathLength="1" d="M32 12V6L8 11a4 4 0 0 0-3 4v17h29V14H8" />
      <path className="feature-detail feature-wallet-card" d="M34 20H24v7h10M28 23.5h1" />
    </> : <>
      <path className="feature-spark feature-spark--one" d="m18 9 3.5 9.5L31 22l-9.5 3.5L18 35l-3.5-9.5L5 22l9.5-3.5Z" />
      <path className="feature-spark feature-spark--two" d="m31 3 1.8 4.2L37 9l-4.2 1.8L31 15l-1.8-4.2L25 9l4.2-1.8Z" />
      <path className="feature-spark feature-spark--three" d="m7 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
    </>}
  </svg>;
}

export function LandingFeatures() {
  const section = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    if (!section.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => {
      const inView = entries.some(entry => entry.isIntersecting);
      setVisible(inView);
      setPageVisible(!document.hidden);
      if (inView) setRevealed(true);
    }, { threshold: .15 });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return <section ref={section} id="how-it-works" className="landing-pillars" data-revealed={revealed} data-motion-active={visible && pageVisible} aria-labelledby="pillars-title">
    <Sprout className="section-flourish" size={31} strokeWidth={1} aria-hidden="true" />
    <h2 id="pillars-title">All the tools you need, in one place.</h2>
    <div className="pillar-grid">
      {features.map(({ kind, title, copy }) => <div className={`pillar pillar--${kind}`} key={kind}>
        <div className="feature-icon"><FeatureIcon kind={kind} /></div>
        <h3>{title}</h3><p>{copy}</p>
      </div>)}
    </div>
  </section>;
}
