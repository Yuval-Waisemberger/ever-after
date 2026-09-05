import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormField } from "@/components/ui/form-field";
import { ChoiceGrid } from "@/components/ui/choice-grid";
import { LinkButton } from "@/components/ui/link-button";
import { DashboardCard } from "@/components/wedding/dashboard-card";

const parse = (markup: string) => new DOMParser().parseFromString(markup, "text/html");

describe("Ever After shared presentation contracts", () => {
  it("retains native field attributes and accessible validation associations", () => {
    const document = parse(renderToStaticMarkup(<FormField name="email" type="email" label="Primary email" hint="Use your account email" error="Enter a valid email" required autoComplete="email" />));
    const input = document.querySelector("input")!;
    expect(input.name).toBe("email");
    expect(input.type).toBe("email");
    expect(input.required).toBe(true);
    expect(input.getAttribute("autocomplete")).toBe("email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("email-error email-hint");
    expect(document.querySelector('label[for="email"]')).not.toBeNull();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("Enter a valid email");
  });

  it("adds an accessible password visibility control only to password fields", () => {
    const password = parse(renderToStaticMarkup(<FormField name="password" type="password" label="Password" />));
    expect(password.querySelector('button[aria-label="Show password"]')).not.toBeNull();
    expect(password.querySelector("input")?.type).toBe("password");
    const email = parse(renderToStaticMarkup(<FormField name="email" type="email" label="Email" />));
    expect(email.querySelector("button")).toBeNull();
  });

  it("preserves multi-select values and the existing checked selections", () => {
    const document = parse(renderToStaticMarkup(<ChoiceGrid name="styles" choices={["Elegant", "Urban", "Nature"]} selected={["Urban"]} />));
    const inputs = [...document.querySelectorAll("input")];
    expect(inputs.map(input => input.name)).toEqual(["styles", "styles", "styles"]);
    expect(inputs.map(input => input.value)).toEqual(["Elegant", "Urban", "Nature"]);
    expect(inputs.filter(input => input.checked).map(input => input.value)).toEqual(["Urban"]);
    expect(inputs.every(input => input.type === "checkbox")).toBe(true);
  });

  it("keeps shared actions as links and dashboard content supplied by the caller", () => {
    const document = parse(renderToStaticMarkup(<DashboardCard title="Budget" footer={<LinkButton href="/budget" tone="secondary">Open Budget</LinkButton>}><p>Not set</p></DashboardCard>));
    expect(document.querySelector("h2")?.textContent).toBe("Budget");
    expect(document.querySelector("p")?.textContent).toBe("Not set");
    expect(document.querySelector("a")?.getAttribute("href")).toBe("/budget");
    expect(document.querySelector("button")).toBeNull();
  });
});
