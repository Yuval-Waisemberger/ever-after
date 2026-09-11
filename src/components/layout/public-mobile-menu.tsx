"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export function PublicMobileMenu({
  links,
  authenticated,
  children,
  loginHref = "/auth/couple?mode=login",
  signupHref = "/auth/couple?mode=signup",
}: {
  links: Array<{ href: string; label: string }>;
  authenticated: boolean;
  children?: ReactNode;
  loginHref?: string;
  signupHref?: string;
}) {
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
        {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        {children}
        {!authenticated ? <>
          <a href={loginHref}>Log in</a>
          <a href={signupHref}>Sign up</a>
          <a href="/auth/vendor">Are you a vendor? Join Ever After →</a>
        </> : null}
      </nav>
    </details>
  );
}
