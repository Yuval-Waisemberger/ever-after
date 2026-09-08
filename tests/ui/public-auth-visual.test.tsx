import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingHero, LandingPetals } from "@/components/public/landing-hero";
import { LandingNavigation } from "@/components/public/landing-navigation";
import { LandingFeatures } from "@/components/public/landing-features";
import { AuthPage } from "@/components/auth/auth-page";

vi.mock("@/lib/actions/auth", () => ({ signIn: vi.fn(), signUpCouple: vi.fn(), signUpVendor: vi.fn(), resendVerification: vi.fn() }));
const parse = (markup: string) => new DOMParser().parseFromString(markup, "text/html");

describe("Public/Auth visual boundaries", () => {
  it("keeps hero entry paths and decorative petals separate from meaningful content", () => {
    const doc = parse(renderToStaticMarkup(<><LandingHero /><LandingPetals finished={false} /></>));
    expect(doc.querySelectorAll(".landing-petal")).toHaveLength(12);
    expect(doc.querySelector(".landing-petals")?.getAttribute("aria-hidden")).toBe("true");
    expect(doc.querySelector(".landing-petals a, .landing-petals button")).toBeNull();
    expect(doc.querySelector(".landing-hero .landing-petals")).toBeNull();
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector(".hero-primary")?.getAttribute("href")).toBe("/auth/couple");
    expect(doc.querySelector(".hero-secondary")?.getAttribute("href")).toBe("/vendors");
    expect(doc.querySelector(".hero-vendor a")?.getAttribute("href")).toBe("/auth/vendor");
    expect(decodeURIComponent(doc.querySelector("img")!.getAttribute("src")!)).toContain("/images/landing/hero-wide-final.webp");
  });
  it("uses logo-free navigation, landing anchors and a progressive signup gate", () => {
    const doc = parse(renderToStaticMarkup(<LandingNavigation />));
    expect(doc.querySelector("img, .public-brand")).toBeNull();
    expect(doc.querySelectorAll('a[href="#how-it-works"]')).toHaveLength(2);
    expect(doc.querySelectorAll('a[href="#about-us"]')).toHaveLength(2);
    expect(doc.querySelector(".landing-assistant-link")?.getAttribute("href")).toBe("/auth/couple");
    expect(doc.querySelector("dialog")?.hasAttribute("open")).toBe(false);
  });
  it("server-renders all four features without depending on animation or observers", () => {
    const doc = parse(renderToStaticMarkup(<LandingFeatures />));
    expect(doc.querySelectorAll(".pillar h3")).toHaveLength(4);
    expect(doc.querySelectorAll(".feature-icon svg[aria-hidden=true]")).toHaveLength(4);
    expect(doc.querySelector("[hidden], [inert]")).toBeNull();
  });
  it("keeps the Couple editorial copy, photograph and form as separate composition regions", () => {
    const doc = parse(renderToStaticMarkup(<AuthPage audience="couple" mode="login" />));
    expect([...doc.querySelector(".auth-layout")!.children].map(el => el.className)).toEqual(["auth-introduction", "auth-image", "auth-panel"]);
    expect(doc.querySelectorAll(".auth-editorial-list li")).toHaveLength(4);
    expect(doc.querySelector(".couple-auth-navigation a[href='/#how-it-works']")).not.toBeNull();
    expect(doc.querySelector(".auth-copy input, .auth-image input")).toBeNull();
    const logo = doc.querySelector(".auth-illustrated-brand img")!;
    expect(decodeURIComponent(logo.getAttribute("src")!)).toContain("/brand/ever-after-logo-black.webp");
    expect(logo.getAttribute("width")).toBe("2172");
    expect(logo.getAttribute("height")).toBe("724");
  });
  it.each(["login", "signup"] as const)("preserves the Couple %s form contract", mode => {
    const doc = parse(renderToStaticMarkup(<AuthPage audience="couple" mode={mode} />));
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector('[name="password"]')?.getAttribute("type")).toBe("password");
    expect(doc.querySelector('[name="password"]')?.getAttribute("autocomplete")).toBe(mode === "login" ? "current-password" : "new-password");
    expect(doc.querySelector('[name="email"]')?.hasAttribute("required")).toBe(true);
    expect(doc.querySelector(".auth-support-strip")?.textContent).toContain("Planning with Ever After AI");
    if (mode === "signup") {
      expect([...doc.querySelectorAll("input[name]")].map(el => el.getAttribute("name"))).toEqual(["partnerOneName", "partnerTwoName", "displayName", "partnerOnePhone", "partnerTwoPhone", "email", "secondEmail", "password", "confirmPassword"]);
      expect(doc.querySelector('[name="partnerOnePhone"]')?.hasAttribute("required")).toBe(false);
      expect(doc.querySelector('[name="secondEmail"]')?.hasAttribute("required")).toBe(false);
    }
  });
  it("leaves Vendor Auth outside the Couple presentation", () => {
    const doc = parse(renderToStaticMarkup(<AuthPage audience="vendor" mode="login" />));
    expect(doc.querySelector(".auth-page--couple, .auth-support-strip, .couple-auth-submit")).toBeNull();
    expect(doc.querySelector("h2")?.textContent).toBe("Your Work. Their Perfect Day.");
  });
});
