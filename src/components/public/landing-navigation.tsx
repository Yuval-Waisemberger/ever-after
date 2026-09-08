"use client";

import Link from "next/link";
import Image from "next/image";
import { LockKeyhole, X } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { PublicMobileMenu } from "@/components/layout/public-mobile-menu";

const landingLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "/vendors", label: "Vendors" },
  { href: "#about-us", label: "About us" },
];

/** Landing-only presentation; account links use the existing auth routes. */
export function LandingNavigation({ context = "landing" }: { context?: "landing" | "auth" }) {
  const links = landingLinks.map(link => ({ ...link, href: context === "auth" && link.href.startsWith("#") ? `/${link.href}` : link.href }));
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  function explainAssistant(event: MouseEvent<HTMLAnchorElement>) {
    // Without JS this remains a normal sign-up link.
    if (!dialog.current?.showModal) return;
    event.preventDefault();
    trigger.current = event.currentTarget;
    dialog.current.showModal();
  }
  const assistant = <a href="/auth/couple" className="landing-assistant-link" onClick={explainAssistant} aria-haspopup="dialog">
    <span><LockKeyhole size={15} aria-hidden="true" /> AI Assistant</span>
    <small>Sign up to use</small>
  </a>;
  return (
    <header className={`public-theme public-header landing-navigation${context === "auth" ? " couple-auth-navigation" : ""}`}>
      <a className="public-skip-link" href="#main-content">Skip to content</a>
      <div className="public-header-inner">
        {context === "auth" ? <Link href="/" className="auth-illustrated-brand" aria-label="Ever After home">
          <Image src="/brand/ever-after-logo-black.webp" alt="Ever After" width={2172} height={724} sizes="(max-width: 600px) 180px, 250px" priority />
        </Link> : null}
        <nav className="public-desktop-nav" aria-label="Public navigation">
          <div className="public-nav-pages">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}{assistant}</div>
          <div className="public-nav-account">
            <Link href="/auth/couple?mode=login">Log in</Link>
            <Link href="/auth/couple" className="public-button header-signup">Sign up</Link>
          </div>
        </nav>
        <PublicMobileMenu links={links} authenticated={false}>{assistant}</PublicMobileMenu>
      </div>
      <dialog ref={dialog} className="landing-assistant-dialog ea-surface ea-surface--champagne" aria-labelledby="assistant-unlock-title" onKeyDown={event => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>("button, a[href]");
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }} onClose={() => {
        // Mobile disclosure closes when a link is chosen; return to its visible summary.
        const opener = trigger.current;
        const menu = opener?.closest("details");
        if (menu && !menu.open) menu.querySelector("summary")?.focus();
        else opener?.focus();
      }}>
        <button type="button" className="ea-icon-button" aria-label="Close" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
        <LockKeyhole size={23} aria-hidden="true" />
        <h2 id="assistant-unlock-title">Your wedding, with a little guidance.</h2>
        <p>Create an account to unlock your personalized Wedding Assistant.</p>
        <Link href="/auth/couple" className="ea-button ea-button--primary">Create an account</Link>
        <Link href="/auth/couple?mode=login" className="ea-text-action">Already a member? Log in</Link>
      </dialog>
    </header>
  );
}
