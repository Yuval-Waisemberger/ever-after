"use client";

import { useEffect, useRef, useState } from "react";
import { UserPlus } from "lucide-react";

/** Toggles the existing native details element without remounting form or summary. */
export function GuestFormToggle({ initialOpen }: { initialOpen: boolean }) {
  const [expanded, setExpanded] = useState(initialOpen);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const form = document.getElementById("guest-form");
    if (!(form instanceof HTMLDetailsElement)) return;
    const sync = () => {
      setExpanded(form.open);
      if (!form.open && form.contains(document.activeElement)) button.current?.focus();
    };
    form.addEventListener("toggle", sync);
    return () => form.removeEventListener("toggle", sync);
  }, []);
  return <button ref={button} type="button" className="ea-button ea-button--primary" aria-controls="guest-form" aria-expanded={expanded} onClick={() => {
    const form = document.getElementById("guest-form");
    if (form instanceof HTMLDetailsElement) {
      form.open = !form.open;
      setExpanded(form.open);
    }
  }}><UserPlus className="size-4" aria-hidden="true" />Add guest / household</button>;
}
