"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Heart, Sparkles } from "lucide-react";
import { BookingIntentContext } from "./feedback-settlement";
import Link from "next/link";

// Curated endpoints: one local burst, never random or viewport-wide.
const particles = [[-130,-64],[-92,-96],[-54,-78],[-18,-106],[32,-89],[76,-100],[118,-63],[143,-18],[104,26],[58,46],[12,35],[-38,54],[-88,32],[-137,4],[-110,-33],[94,-40]];

export function BookingCelebration({ businessName }: { businessName: string }) {
  return <section className="booking-celebration" role="status" aria-label="Booking confirmed">
    <span className="booking-success-check"><Check size={24} pathLength={1} aria-hidden="true" /></span>
    <p className="eyebrow">A little milestone</p>
    <h2>Booked for your day!</h2><p>{businessName} is now part of your wedding.</p>
    <Link href="/vendors/my" className="ea-text-action">View in Our Vendors →</Link>
    <div className="booking-confetti" aria-hidden="true">{particles.map(([x,y], i) => <span key={i} style={{ "--burst-x": `${x}px`, "--burst-y": `${y}px`, "--burst-turn": `${(i % 2 ? -1 : 1) * (50 + i * 13)}deg`, "--particle-color": `var(--${["wine","champagne","rose","cream"][i % 4]})` } as CSSProperties}>{i % 4 === 0 ? <Heart size={10} /> : i % 4 === 1 ? <Sparkles size={10} /> : <i className={i % 4 === 2 ? "confetti-petal" : "confetti-dot"} />}</span>)}</div>
  </section>;
}

/** Presentation observes an actual server-supplied state transition after this form submits.
 * Query flags, highlights, page loads and bookmark changes are never success authority. */
export function BookingFeedback({ status, businessName, children }: { status?: string | null; businessName: string; children: ReactNode }) {
  const previous = useRef(status), requested = useRef(false);
  const [celebrated, setCelebrated] = useState(false);
  const clearIntent = useCallback(() => { requested.current = false; }, []);
  useEffect(() => {
    const changed = previous.current !== status; previous.current = status;
    if (!changed) return;
    const confirmed = requested.current && status === "booked"; requested.current = false;
    const frame = requestAnimationFrame(() => setCelebrated(confirmed));
    return () => cancelAnimationFrame(frame);
  }, [status]);
  return <BookingIntentContext.Provider value={clearIntent}><div onSubmitCapture={event => {
    if (!(event.target instanceof HTMLFormElement)) return;
    const data = new FormData(event.target);
    requested.current = status !== "booked" && (data.get("status") === "booked" || data.get("lifecycleStatus") === "booked");
    setCelebrated(false);
  }}>
    {children}
    {celebrated && status === "booked" ? <BookingCelebration businessName={businessName} /> : null}
  </div></BookingIntentContext.Provider>;
}
