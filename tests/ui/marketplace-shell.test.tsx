import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { RecoveryPage } from "@/components/auth/recovery-page";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import type { CurrentProfile } from "@/lib/auth/user";
import { demoVendors } from "@/lib/vendors/demo";

const auth = vi.hoisted(() => ({ profile: null as CurrentProfile | null }));

vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ role, children }: {role: string; children: ReactNode}) => <div data-role={role}>{children}</div> }));
vi.mock("@/lib/auth/user", () => ({getCurrentProfile: vi.fn(async () => auth.profile)}));
vi.mock("@/lib/queries/wedding", () => ({getOwnedWedding: vi.fn(async () => ({setup_status: "completed"}))}));
vi.mock("@/lib/queries/couple-identity", () => ({getCoupleIdentity: vi.fn(async () => ({avatarChoice: "heart", photoUrl: null}))}));
vi.mock("@/lib/queries/vendor-dashboard", () => ({getVendorIdentity: vi.fn(async () => ({displayName: "Canonical business", photoUrl: null}))}));
vi.mock("@/lib/queries/couple-vendors", () => ({getVendorRelationship: vi.fn(async () => null)}));

import { VendorProfilePresentation } from "@/components/vendors/vendor-profile-presentation";

describe("Marketplace server shell selection", () => {
  it.each(["couple", "vendor"] as const)("renders only the %s shell before hydration", async role => {
    const profile: CurrentProfile = {id: "test", role, displayName: "Test", avatarChoice: "heart", avatarStoragePath: null};
    const html = renderToStaticMarkup(await MarketplaceShell({profile, children: <main>Marketplace</main>}));
    expect(html).toContain(`data-role="${role}"`);
    expect(html).not.toContain("How it works");
    expect(html).toContain("Marketplace");
  });
  it("reuses the canonical public navigation for a guest without an application shell", async () => {
    const html = renderToStaticMarkup(await MarketplaceShell({profile: null, children: <main>Marketplace</main>}));
    const document = new DOMParser().parseFromString(html, "text/html");
    const desktop = document.querySelector(".public-desktop-nav")!;
    expect([...desktop.querySelectorAll("a, button")].map(element => element.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "How it works",
      "Vendors",
      "About us",
      "AI AssistantSign up to use",
      "Log in",
      "Sign up",
    ]);
    expect(document.querySelector('.landing-navigation.couple-auth-navigation')).not.toBeNull();
    expect(document.querySelector('a[aria-label="Ever After home"]')).not.toBeNull();
    expect(document.querySelector('[data-about-trigger="desktop"][aria-haspopup="dialog"]')).not.toBeNull();
    expect(document.querySelector('.landing-assistant-link[href="/auth/couple"] svg')).not.toBeNull();
    expect(document.querySelector('.landing-assistant-link small')?.textContent).toBe("Sign up to use");
    expect(document.querySelector('#public-mobile-navigation [data-about-trigger="mobile"]')).not.toBeNull();
    expect(html).not.toContain("data-role");
  });

  it("uses the canonical public navigation on password-recovery pages", () => {
    const html = renderToStaticMarkup(<RecoveryPage publicNavigation authAudience="vendor"><section>Recovery form</section></RecoveryPage>);
    const document = new DOMParser().parseFromString(html, "text/html");
    expect([...document.querySelectorAll(".public-desktop-nav a, .public-desktop-nav button")].map(element => element.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "How it works",
      "Vendors",
      "About us",
      "AI AssistantSign up to use",
      "Log in",
      "Sign up",
    ]);
    expect(document.querySelector(".auth-brand-bar")).toBeNull();
    expect(document.querySelector(".public-mobile-menu")).not.toBeNull();
    expect(document.querySelector('a[href="/auth/vendor?mode=login"]')).not.toBeNull();
    expect(document.querySelector('a[href="/auth/vendor?mode=signup"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Recovery form");
  });

  it.each([null, "couple", "vendor"] as const)("selects the canonical %s vendor-profile shell", async role => {
    auth.profile = role ? {id: "test", role, displayName: "Test", avatarChoice: "heart", avatarStoragePath: null} : null;
    const html = renderToStaticMarkup(await VendorProfilePresentation({vendor: demoVendors[0]}));
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector(".vendor-profile-page")).not.toBeNull();
    if (role) {
      expect(document.querySelector(`[data-role="${role}"]`)).not.toBeNull();
      expect(document.querySelector(".landing-navigation")).toBeNull();
    } else {
      expect(document.querySelector(".landing-navigation.couple-auth-navigation")).not.toBeNull();
      expect(document.querySelector("[data-role]")).toBeNull();
    }
  });
});
