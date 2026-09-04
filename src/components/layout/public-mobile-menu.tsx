"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function PublicMobileMenu({ workspaceHref }: { workspaceHref?: string }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    disclosure.current?.setAttribute("data-enhanced", "true");
  }, []);
  return (
    <details ref={disclosure} className="public-mobile-menu" onKeyDown={(event) => {
      if (event.key === "Escape" && disclosure.current) {
        disclosure.current.open = false;
        summary.current?.focus();
      }
    }}>
      <summary ref={summary} aria-label="Navigation menu" aria-controls="public-mobile-navigation">
        <Menu className="menu-open-icon" size={24} strokeWidth={1.3} />
        <X className="menu-close-icon" size={24} strokeWidth={1.3} />
      </summary>
      <nav id="public-mobile-navigation" aria-label="Mobile navigation" onClick={() => {
        if (disclosure.current) disclosure.current.open = false;
      }}>
        {/* Native navigation intentionally survives closing this disclosure before routing. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/#how-it-works">How it works</a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/vendors">Vendors</a>
        {workspaceHref ? <a href={workspaceHref}>Open workspace</a> : <>
          <a href="/auth/couple?mode=login">Log in</a>
          <a href="/auth/couple">Sign up</a>
          <a href="/auth/vendor">Are you a vendor? Join Ever After →</a>
        </>}
      </nav>
    </details>
  );
}
