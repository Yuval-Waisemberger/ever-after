"use client";
import { createContext, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export const BookingIntentContext = createContext<(() => void) | undefined>(undefined);
/** Clear an unfulfilled visual intent when the real request settles. Allow the
 * same React commit's confirmed props effect to run first; never retain a failed intent. */
export function FeedbackSettlement({ onSettled }: { onSettled?: () => void }) {
  const context = useContext(BookingIntentContext);
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) { wasPending.current = true; return; }
    if (!wasPending.current) return;
    wasPending.current = false;
    const frame = requestAnimationFrame(() => (onSettled ?? context)?.());
    return () => cancelAnimationFrame(frame);
  }, [pending, onSettled, context]);
  return null;
}
