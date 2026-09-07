import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PageTransition } from "@/components/layout/page-transition";
import { PageLoading } from "@/components/ui/page-loading";
import { LinkButton } from "@/components/ui/link-button";

const parse = (markup: string) => new DOMParser().parseFromString(markup, "text/html");

describe("shared visual foundation", () => {
  it("server-renders final route content without a hidden or inert state", () => {
    const document = parse(renderToStaticMarkup(<PageTransition><main><h1>Budget</h1><a href="/tasks">Tasks</a></main></PageTransition>));
    expect(document.querySelector("main")?.textContent).toBe("BudgetTasks");
    expect(document.querySelector("[hidden], [inert], [aria-hidden=true]")).toBeNull();
    expect(document.querySelector("a")?.getAttribute("href")).toBe("/tasks");
  });

  it("announces actual loading once and keeps decorative bars out of the accessibility tree", () => {
    const document = parse(renderToStaticMarkup(<PageLoading />));
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(document.querySelector('[role="status"]')?.getAttribute("aria-busy")).toBe("true");
    expect(document.querySelectorAll('[aria-hidden=true] .ea-skeleton')).toHaveLength(3);
    expect(document.querySelector("button, input")).toBeNull();
  });

  it.each(["primary", "secondary", "quiet"] as const)("preserves native link behavior for the %s shared control", (tone) => {
    const document = parse(renderToStaticMarkup(<LinkButton tone={tone} href="/vendors?category=venues" aria-label="Browse venues">Venues</LinkButton>));
    const link = document.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/vendors?category=venues");
    expect(link.getAttribute("aria-label")).toBe("Browse venues");
    expect(link.classList.contains(`ea-button--${tone}`)).toBe(true);
  });
});
