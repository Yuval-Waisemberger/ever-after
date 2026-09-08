"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, Flower2 } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

// Curated throws: distinct depth, impulse, drift and launch time; no shared target.
// First eight retain a balanced, lighter composition on small screens.
const petals = [
  { x: 8, y: 22, size: 82, blur: 3, delay: 0, duration: 1900, dx: -75, rise: 42, fall: 135, alpha: .48, turn: -38, tilt: 45 },
  { x: 21, y: 62, size: 34, blur: .2, delay: 180, duration: 2200, dx: -130, rise: 108, fall: 85, alpha: .55, turn: 64, tilt: -24 },
  { x: 33, y: 9, size: 17, blur: .2, delay: 90, duration: 2420, dx: -34, rise: 25, fall: 92, alpha: .32, turn: 9, tilt: 14 },
  { x: 76, y: 18, size: 30, blur: .1, delay: 80, duration: 2300, dx: 110, rise: 45, fall: 135, alpha: .51, turn: -24, tilt: 35 },
  { x: 91, y: 48, size: 74, blur: 2.8, delay: 440, duration: 1850, dx: 95, rise: 80, fall: 115, alpha: .48, turn: 48, tilt: -46 },
  { x: 5, y: 78, size: 43, blur: .4, delay: 270, duration: 2300, dx: 90, rise: 110, fall: 30, alpha: .54, turn: -52, tilt: 28 },
  { x: 63, y: 73, size: 26, blur: 0, delay: 610, duration: 2040, dx: 155, rise: 90, fall: 85, alpha: .46, turn: 17, tilt: -18 },
  { x: 49, y: 4, size: 16, blur: .1, delay: 690, duration: 2130, dx: 85, rise: 26, fall: 100, alpha: .3, turn: -8, tilt: 12 },
  { x: 84, y: 87, size: 35, blur: .3, delay: 410, duration: 2170, dx: 45, rise: 120, fall: 20, alpha: .5, turn: 42, tilt: -34 },
  { x: 96, y: 11, size: 21, blur: .2, delay: 200, duration: 2390, dx: -28, rise: 28, fall: 118, alpha: .33, turn: 12, tilt: 20 },
  { x: 25, y: 80, size: 86, blur: 3.4, delay: 720, duration: 1800, dx: -85, rise: 145, fall: 10, alpha: .43, turn: -70, tilt: 52 },
  { x: 69, y: 41, size: 39, blur: .2, delay: 310, duration: 2020, dx: 72, rise: 60, fall: 125, alpha: .5, turn: 31, tilt: -30 },
];
const petalShapes = [
  "M7 9C9 4 17 9 22 5C28 0 36 5 39 10C46 8 55 15 52 23C51 28 39 29 36 35C30 43 23 38 19 34C9 35 2 25 7 19C4 15 3 12 7 9Z",
  "M6 18C5 9 17 3 27 6C36 2 48 10 50 19C53 28 41 34 29 36C22 42 10 33 11 26C4 25 2 22 6 18Z",
  "M9 8C16 3 20 10 28 7C36 3 45 7 46 16C52 21 46 28 38 29C34 38 21 40 19 31C10 30 13 22 7 19C3 16 4 11 9 8Z",
];

export function LandingHero() {
  const [imageReady, setImageReady] = useState(false);
  const [petalHost, setPetalHost] = useState<HTMLElement | null>(null);
  const [petalsFinished, setPetalsFinished] = useState(false);
  useEffect(() => {
    // A one-time opening event; scrolling away must not carry it into the page.
    const dismiss = () => setPetalsFinished(true);
    window.addEventListener("scroll", dismiss, { passive: true, once: true });
    return () => window.removeEventListener("scroll", dismiss);
  }, []);
  return (
    <>
    <section className="landing-hero" data-image-ready={imageReady} aria-labelledby="hero-title">
      <div className="hero-media" aria-hidden="true">
        <Image src="/images/landing/hero-wide-final.webp" alt="" fill sizes="(max-width: 600px) 1541px, (max-width: 900px) 1317px, 100vw" priority className="hero-photo" onLoad={event => {
          setImageReady(true);
          setPetalHost(event.currentTarget.closest<HTMLElement>(".landing-page"));
          if (window.scrollY > 0) setPetalsFinished(true);
        }} />
      </div>
      <div className="hero-content">
        <p className="hero-eyebrow">Your day, beautifully organized</p>
        <h1 id="hero-title">EVER AFTER</h1>
        <div className="hero-ornament" aria-hidden="true"><span /><Flower2 size={22} strokeWidth={1} /><span /></div>
        <p className="hero-tagline">Everything before your ever after</p>
        <p className="hero-description">Plan your wedding, discover the right vendors,<br className="desktop-break" /> and keep every detail in one beautiful place.</p>
        <div className="hero-actions">
          <Link href="/auth/couple" className="public-button hero-primary ea-brand-cta">Plan our wedding <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link href="/vendors" className="public-button hero-secondary">Explore vendors <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <p className="hero-vendor">Are you a vendor? <Link href="/auth/vendor">Join Vendor <span aria-hidden="true">→</span></Link></p>
      </div>
      <a href="#how-it-works" className="hero-scroll" aria-label="Discover how Ever After works"><ChevronDown size={25} strokeWidth={1} /></a>
      <svg className="hero-wave" viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true"><path d="M0 12C260 87 409 21 720 42S1180 76 1440 8V64H0Z" /></svg>
    </section>
    {petalHost ? createPortal(<LandingPetals finished={petalsFinished} onFinish={() => setPetalsFinished(true)} />, petalHost) : null}
    </>
  );
}

/** Portaled beside header/main, outside hero clipping and route transforms. */
export function LandingPetals({ finished, onFinish }: { finished: boolean; onFinish?: () => void }) {
  return <div className="landing-petals" aria-hidden="true" data-finished={finished} onAnimationEnd={event => {
    // Petal 8 has the longest combined delay/duration, including on mobile.
    if (event.animationName === "landing-petal-drift" && (event.target as HTMLElement).dataset.lastPetal === "true") onFinish?.();
  }}>
    {petals.map((petal, i) => <span key={i} className="landing-petal" data-last-petal={i === 7 || undefined} style={{
      "--petal-left": `${petal.x}%`, "--petal-top": `${petal.y}%`, "--petal-size": `${petal.size}px`,
      "--petal-blur": `${petal.blur}px`, "--petal-delay": `${petal.delay}ms`, "--petal-duration": `${petal.duration}ms`,
      "--petal-drift": `${petal.dx}px`, "--petal-rise": `${petal.rise}px`, "--petal-fall": `${petal.fall}px`,
      "--petal-turn": `${petal.turn}deg`, "--petal-tilt": `${petal.tilt}deg`, "--petal-opacity": petal.alpha,
    } as CSSProperties}><svg className="petal-body" viewBox="0 0 60 44">
      <defs><linearGradient id={`petal-light-${i}`} x2=".8" y2="1"><stop stopColor="var(--cream)" /><stop offset=".65" stopColor="var(--cream)" /><stop offset="1" stopColor="var(--champagne)" /></linearGradient></defs>
      <path fill={`url(#petal-light-${i})`} d={petalShapes[i % petalShapes.length]} />
      <path className="petal-fold" d="M10 15C21 22 28 24 42 17M23 34Q29 23 40 14" />
    </svg></span>)}
  </div>;
}
