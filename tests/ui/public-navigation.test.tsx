import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryNavigation } from "@/components/vendors/category-navigation";
import { PublicMobileMenu } from "@/components/layout/public-mobile-menu";
import { getPublicHeaderLinks } from "@/components/layout/public-header-links";
import vendors from "@/generated/marketplace-demo.json";

describe("public navigation", () => {
  it("links every Marketplace category slug and identifies the selected one", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<CategoryNavigation selected="photography-content" />), "text/html");
    const links = [...document.querySelectorAll<HTMLAnchorElement>(".category-navigation a")];
    expect(links).toHaveLength(8);
    expect(document.querySelector('a[href="/vendors#marketplace-results"]')).not.toBeNull();
    expect(links.map(link => new URL(link.href, "http://localhost").searchParams.get("category")).sort()).toEqual([...new Set(vendors.map(vendor => vendor.categorySlug))].sort());
    expect(links.every(link => link.hash === "#marketplace-results")).toBe(true);
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe("Photography & Content");
  });

  it("keeps the mobile disclosure closed and exposes signed-in product navigation", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<PublicMobileMenu authenticated links={[{ href: "/wedding", label: "Our Wedding" }, { href: "/tasks", label: "Our Tasks" }]} />), "text/html");
    expect(document.querySelector("details")?.hasAttribute("open")).toBe(false);
    expect(document.querySelector("summary")?.getAttribute("aria-controls")).toBe("public-mobile-navigation");
    expect(document.querySelector('a[href="/wedding"]')?.textContent).toBe("Our Wedding");
    expect(document.querySelector('a[href="/tasks"]')?.textContent).toBe("Our Tasks");
    expect(document.querySelector('a[href="/auth/couple"]')).toBeNull();
  });

  it("adds Our Guests only to the Couple main navigation in the intended order", () => {
    const couple = getPublicHeaderLinks("couple");
    const vendor = getPublicHeaderLinks("vendor");
    const anonymous = getPublicHeaderLinks(null);

    expect([...couple.navigationLinks, ...couple.accountLinks].map((link) => link.label)).toEqual([
      "How it works",
      "Our Wedding",
      "Our Tasks",
      "Our Guests",
      "Vendors",
      "Budget",
      "Assistant",
      "Settings",
    ]);
    expect(couple.navigationLinks.find((link) => link.label === "Our Guests")?.href).toBe("/guests");
    expect(vendor.navigationLinks.some((link) => link.href === "/guests")).toBe(false);
    expect(anonymous.navigationLinks.some((link) => link.href === "/guests")).toBe(false);
  });
});
