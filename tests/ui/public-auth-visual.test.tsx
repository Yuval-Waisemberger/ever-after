import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingHero, LandingPetals } from "@/components/public/landing-hero";
import { LandingNavigation } from "@/components/public/landing-navigation";
import { LandingFeatures } from "@/components/public/landing-features";
import { AuthPage } from "@/components/auth/auth-page";
import { VerificationPanel } from "@/components/auth/verification-panel";

vi.mock("@/lib/actions/auth", () => ({ signInCouple: vi.fn(), signInVendor: vi.fn(), signUpCouple: vi.fn(), signUpVendor: vi.fn(), resendVerification: vi.fn() }));
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
    expect(doc.querySelectorAll('button[aria-haspopup="dialog"]')).toHaveLength(2);
    expect(doc.querySelector(".about-us-dialog")?.textContent).toContain("We are Yuval and Liat, second-year B.Sc. Computer Science students.");
    expect(doc.querySelector(".landing-assistant-link")?.getAttribute("href")).toBe("/auth/couple");
    expect(doc.querySelector("dialog")?.hasAttribute("open")).toBe(false);
  });
  it.each(["couple", "vendor"] as const)("keeps desktop and mobile account links in the %s auth flow", audience => {
    const doc = parse(renderToStaticMarkup(<LandingNavigation context="auth" authAudience={audience} />));
    for (const navigation of [".public-desktop-nav", "#public-mobile-navigation"]) {
      expect(doc.querySelector(`${navigation} a[href='/auth/${audience}?mode=login']`)?.textContent).toBe("Log in");
      expect(doc.querySelector(`${navigation} a[href='/auth/${audience}?mode=signup']`)?.textContent).toBe("Sign up");
    }
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
    expect(doc.querySelectorAll(".ea-field-leading")).toHaveLength(mode === "login" ? 2 : 4);
    expect(doc.querySelector("button[type=submit]")?.classList.contains("ea-brand-cta")).toBe(true);
    const switchLink = [...doc.querySelectorAll<HTMLAnchorElement>(".auth-panel a")].find(link => link.classList.contains("font-semibold"));
    expect(switchLink?.getAttribute("href")).toBe(`/auth/couple?mode=${mode === "login" ? "signup" : "login"}`);
    expect(doc.querySelector(".auth-support-strip")?.textContent).toContain("Planning with Ever After AI");
    if (mode === "signup") {
      expect([...doc.querySelectorAll("input[name]")].map(el => el.getAttribute("name"))).toEqual(["partnerOneName", "partnerTwoName", "displayName", "partnerOnePhone", "partnerTwoPhone", "email", "secondEmail", "password", "confirmPassword"]);
      expect(doc.querySelector('[name="partnerOnePhone"]')?.hasAttribute("required")).toBe(false);
      expect(doc.querySelector('[name="secondEmail"]')?.hasAttribute("required")).toBe(false);
    }
  });
  it("leaves Vendor Auth outside the Couple presentation", () => {
    const doc = parse(renderToStaticMarkup(<AuthPage audience="vendor" mode="login" />));
    expect(doc.querySelector(".auth-page--couple, .auth-support-strip")).toBeNull();
    expect(doc.querySelector(".couple-auth-submit .lucide-arrow-right")).not.toBeNull();
    expect(doc.querySelector(".auth-image img")?.getAttribute("src")).toBe("/images/auth/vendor-auth-planner.png");
    expect(doc.querySelector("h2")?.textContent).toBe("Your Work. Their Perfect Day.");
  });
  it.each(["couple", "vendor"] as const)("separates the %s verification notice from its browser instruction", audience => {
    const doc = parse(renderToStaticMarkup(<VerificationPanel audience={audience} email="person@example.test" />));
    const notice = doc.querySelector('[role="note"].verification-spam-notice');
    expect(notice?.textContent).toBe("Important: The verification email may arrive in your Spam or Junk folder. Check those folders if needed.");
    expect(notice?.classList.contains("text-base")).toBe(true);
    expect(notice?.classList.contains("font-semibold")).toBe(true);
    expect(doc.body.textContent).toContain("If you requested more than one email, use the link in the newest one. For verification to work correctly, open it in this same browser.");
    expect(doc.body.textContent).not.toContain("Check your spam folder too. Open the latest link in the same browser where you requested it.");
    expect(doc.querySelector('form input[name="audience"]')?.getAttribute("value")).toBe(audience);
    expect(doc.querySelector('form input[name="email"]')?.getAttribute("value")).toBe("person@example.test");
    expect(doc.querySelector("form button[type=submit]")?.textContent).toBe("Resend verification email");
    expect(doc.querySelector(`nav a[href="/auth/${audience}?mode=login"]`)?.textContent).toBe("Back to log in");
    expect(doc.querySelector(`nav a[href="/auth/${audience}"]`)?.textContent).toBe("Back to sign up");
  });
});
