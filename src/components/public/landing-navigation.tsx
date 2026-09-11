"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, LockKeyhole, X } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import { PublicMobileMenu } from "@/components/layout/public-mobile-menu";

const landingLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "/vendors", label: "Vendors" },
];

const aboutText = "We are Yuval and Liat, second-year B.Sc. Computer Science students. Ever After was created as our final project for the Full-Stack Development course, combining thoughtful design and technology to make wedding planning simpler, clearer, and more enjoyable ♡";

/** Landing-only presentation; account links use the existing auth routes. */
export function LandingNavigation({
  context = "landing",
  authAudience = "couple",
}: {
  context?: "landing" | "auth";
  authAudience?: "couple" | "vendor";
}) {
  const links = landingLinks.map(link => ({ ...link, href: context === "auth" && link.href.startsWith("#") ? `/${link.href}` : link.href }));
  const loginHref = `/auth/${authAudience}?mode=login`;
  const signupHref = `/auth/${authAudience}?mode=signup`;
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const aboutDialog = useRef<HTMLDialogElement>(null);
  const aboutTrigger = useRef<HTMLButtonElement | null>(null);
  const aboutClose = useRef<HTMLButtonElement>(null);
  const previousBodyOverflow = useRef("");
  useEffect(() => () => {
    document.body.style.overflow = previousBodyOverflow.current;
  }, []);
  function explainAssistant(event: MouseEvent<HTMLAnchorElement>) {
    // Without JS this remains a normal sign-up link.
    if (!dialog.current?.showModal) return;
    event.preventDefault();
    trigger.current = event.currentTarget;
    dialog.current.showModal();
  }
  function openAbout(event: MouseEvent<HTMLButtonElement>) {
    if (!aboutDialog.current?.showModal) return;
    aboutTrigger.current = event.currentTarget;
    previousBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    aboutDialog.current.showModal();
    aboutClose.current?.focus();
  }
  function restoreAboutTrigger() {
    document.body.style.overflow = previousBodyOverflow.current;
    const opener = aboutTrigger.current;
    const menu = opener?.closest("details");
    if (menu && !menu.open) menu.querySelector<HTMLElement>("summary")?.focus();
    else opener?.focus();
  }
  const aboutButton = (context: "desktop" | "mobile") => <button type="button" className="landing-nav-trigger" onClick={openAbout} aria-haspopup="dialog" data-about-trigger={context}>About us</button>;
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
          <div className="public-nav-pages">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}{aboutButton("desktop")}{assistant}</div>
          <div className="public-nav-account">
            <Link href={loginHref}>Log in</Link>
            <Link href={signupHref} className="public-button header-signup">Sign up</Link>
          </div>
        </nav>
        <PublicMobileMenu links={links} authenticated={false} loginHref={loginHref} signupHref={signupHref}>{aboutButton("mobile")}{assistant}</PublicMobileMenu>
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
      <dialog ref={aboutDialog} className="landing-assistant-dialog about-us-dialog ea-surface ea-surface--champagne" aria-labelledby="about-dialog-title" onClick={event => {
        if (event.target === event.currentTarget) aboutDialog.current?.close();
      }} onKeyDown={event => {
        if (event.key === "Tab") {
          event.preventDefault();
          aboutClose.current?.focus();
        }
      }} onClose={restoreAboutTrigger}>
        <button ref={aboutClose} type="button" className="ea-icon-button" aria-label="Close About Us" onClick={() => aboutDialog.current?.close()}><X size={20} aria-hidden="true" /></button>
        <Heart size={23} aria-hidden="true" />
        <h2 id="about-dialog-title">About Us</h2>
        <p>{aboutText}</p>
      </dialog>
    </header>
  );
}
