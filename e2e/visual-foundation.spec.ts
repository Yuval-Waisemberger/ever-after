import { expect, test } from "@playwright/test";

test("shared controls preserve input and selection with visible focus", async ({ page }) => {
  await page.goto("/");
  const name = page.getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Sample couple");
  await expect(name).toBeFocused();
  await expect(name).toHaveCSS("box-shadow", /inset/);
  await page.getByLabel("Password", { exact: true }).fill("fixture-only-value");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("checkbox", { name: "Elegant" }).check();
  await page.getByRole("switch", { name: "Notifications" }).check();
  await page.getByRole("button", { name: "Render again" }).click();
  await expect(name).toHaveValue("Sample couple");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("fixture-only-value");
  await expect(page.getByRole("checkbox", { name: "Elegant" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Notifications" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Disabled", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Disabled", exact: true })).toHaveCSS("opacity", "0.65");
  const background = await page.getByRole("button", { name: "Primary", exact: true }).evaluate(el => getComputedStyle(el).backgroundImage);
  await expect(page.getByRole("link", { name: "Public primary" })).toHaveCSS("background-image", background);
});

test("content is visible after entrance and loading ends only when content resolves", async ({ page }) => {
  await page.goto("/");
  const main = page.locator(".ea-page-transition > main").first();
  await expect(main).toHaveCSS("animation-duration", "0.38s");
  await expect(main).toHaveCSS("opacity", "1");
  await expect(main).toHaveCSS("transform", "none");
  await expect(page.getByRole("status", { name: "Loading page" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready content" })).toHaveCount(0);
  await page.getByRole("button", { name: "Resolve fixture loading" }).click();
  await expect(page.getByRole("status", { name: "Loading page" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Ready content" })).toBeVisible();
});

test("reduced motion reveals content and preserves feedback and controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const main = page.locator(".ea-page-transition > main").first();
  await expect(main).toHaveCSS("animation-name", "none");
  await expect(main).toHaveCSS("opacity", "1");
  await expect(main).toHaveCSS("transform", "none");
  expect(await page.locator(".ea-skeleton").first().evaluate(el => getComputedStyle(el, "::after").animationName)).toBe("none");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await page.getByRole("switch", { name: "Notifications" }).check();
  await expect(page.getByRole("switch", { name: "Notifications" })).toBeChecked();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resolve fixture loading" }).click();
  await expect(page.getByRole("heading", { name: "Ready content" })).toBeVisible();
});

for (const width of [1440, 768, 390, 360]) {
  test(`foundation fits ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Shared foundation" })).toBeVisible();
    await expect(page.locator(".ea-page-transition > main").first()).toHaveCSS("transform", "none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByText("Waiting on vendor", { exact: true })).toBeVisible();
    await expect(page.getByText("Overdue 3 days", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`foundation-${width}.png`), fullPage: true });
  });
}
