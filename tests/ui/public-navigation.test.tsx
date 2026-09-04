import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryNavigation } from "@/components/vendors/category-navigation";
import { PublicMobileMenu } from "@/components/layout/public-mobile-menu";
import vendors from "@/generated/marketplace-demo.json";

describe("public navigation", () => {
  it("links exactly the six existing category slugs and identifies the selected one", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<CategoryNavigation selected="photography-content" />), "text/html");
    const links = [...document.querySelectorAll("a")];
    expect(links).toHaveLength(6);
    expect(links.map(link => new URL(link.href, "http://localhost").searchParams.get("category")).sort()).toEqual([...new Set(vendors.map(vendor => vendor.categorySlug))].sort());
    expect(links.every(link => link.hash === "#marketplace-results")).toBe(true);
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe("Photography & Content");
  });

  it("keeps the mobile disclosure closed and gives signed-in users their real workspace", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<PublicMobileMenu workspaceHref="/vendor" />), "text/html");
    expect(document.querySelector("details")?.hasAttribute("open")).toBe(false);
    expect(document.querySelector("summary")?.getAttribute("aria-controls")).toBe("public-mobile-navigation");
    expect(document.querySelector('a[href="/vendor"]')?.textContent).toBe("Open workspace");
    expect(document.querySelector('a[href="/auth/couple"]')).toBeNull();
  });
});
