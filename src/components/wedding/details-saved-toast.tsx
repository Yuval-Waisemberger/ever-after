"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

/** Mounted only by the existing successful Details-save redirect. */
export function DetailsSavedToast() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setVisible(false), 2800); return () => clearTimeout(timer); }, []);
  if (!visible) return null;
  return <div role="status" className="planning-save-toast"><Check size={21} aria-hidden="true" /><span>Wedding details saved <Link href="/wedding/details">View details</Link></span><button type="button" aria-label="Dismiss save confirmation" onClick={() => setVisible(false)}><X size={17} aria-hidden="true" /></button></div>;
}
