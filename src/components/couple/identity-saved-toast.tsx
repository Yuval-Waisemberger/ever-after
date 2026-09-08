"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import "@/app/couple-planning.css";

/** Created only after the existing avatar action reports a successful save. */
export function IdentitySavedToast() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setVisible(false), 2800); return () => clearTimeout(timer); }, []);
  if (!visible) return null;
  return <div role="status" className="planning-save-toast"><Check size={21} aria-hidden="true" /><span>Couple profile saved</span><button type="button" aria-label="Dismiss save confirmation" onClick={() => setVisible(false)}><X size={17} aria-hidden="true" /></button></div>;
}
