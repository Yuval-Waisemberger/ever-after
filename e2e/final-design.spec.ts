import { expect, test } from "@playwright/test";
import { designSweep } from "./helpers/design-sweep";

test.beforeEach(async ({ page }) => { await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort()); });

test("complete pages fit intermediate widths with their real shared shell", async ({ page }) => {
  test.setTimeout(180000);
  await designSweep(page, { reviews: "/reviews", settings: "/settings", "vendor-settings": "/vendor/settings", guests: "/guests", budget: "/budget" });
});

test("review entrance keeps real fractional stars, dates and readable bilingual content", async ({ page }) => {
  await page.goto("/reviews");
  const review = page.locator(".couple-review-reveal").first();
  await expect(review).toHaveAttribute("data-enter", "shown");
  await expect(review).toHaveCSS("animation-duration", "1.2s");
  await expect(review.getByRole("img", { name: "4.3 out of 5 stars" })).toBeVisible();
  expect(await review.locator(".vendor-star-fill").last().getAttribute("style")).toContain("25%");
  await expect(review.locator("time")).toHaveText("7 Sept 2026");
  await expect(page.locator('p[dir="auto"]').nth(1)).toContainText("תודה");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(review).toHaveCSS("opacity", "1");
  await expect(review).toHaveCSS("animation-name", "none");
});

test("mobile Budget metrics keep readable labels and amounts within each tile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/budget");
  for (const width of [320, 360, 390, 480, 600, 640]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const metric of await page.locator(".budget-metric").all()) {
      const tile = await metric.boundingBox();
      const label = metric.locator("p").first();
      const labelBox = await label.boundingBox();
      const lineHeight = await label.evaluate(element => parseFloat(getComputedStyle(element).lineHeight));
      expect(labelBox!.height).toBeLessThanOrEqual(lineHeight * 2 + 1);
      const amount = await metric.locator(".planning-value").boundingBox();
      expect(amount!.x + amount!.width).toBeLessThanOrEqual(tile!.x + tile!.width + 1);
    }
  }
});

test("settings success toast follows only a successful fixture action and remains dismissible", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Couple profile saved", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Choose .* couple icon/ }).first().click();
  await expect(page.getByText("Couple profile saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss save confirmation" }).click();
  await expect(page.getByText("Couple profile saved", { exact: true })).toHaveCount(0);
  await page.goto("/settings?fail");
  await page.getByRole("button", { name: /Choose .* couple icon/ }).first().click();
  await expect(page.getByText("This action is disabled in the isolated visual fixture.")).toBeVisible();
  await expect(page.getByText("Couple profile saved", { exact: true })).toHaveCount(0);
});

test("Couple Settings maps the supplied artwork without changing option values", async ({ page }) => {
  await page.goto("/settings");
  const options = [
    ["Heart", "heart.png"],
    ["Bride + Groom", "bride-and-groom.png"],
    ["Bride + Bride", "bride-and-bride.png"],
    ["Groom + Groom", "groom-and-groom.png"],
  ] as const;
  for (const [label, fileName] of options) {
    const button = page.getByRole("button", { name: `Choose ${label} couple icon` });
    const image = button.getByRole("img", { name: `${label} illustration` });
    expect(decodeURIComponent(await image.getAttribute("src") ?? "")).toContain(`/images/couple-settings/${fileName}`);
    await expect(image).toHaveClass(/object-contain/);
    await expect(image.locator("..")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("empty reviews, guests and budget retain usable final states", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["reviews", "guests", "budget"]) {
    await page.goto(`/${route}?empty`);
    await expect(page.locator("h1")).toBeVisible();
    expect(await page.locator("main").innerText()).not.toMatch(/NaN|undefined/);
    await page.screenshot({ path: `.codex-tmp/final-design/screenshots/${route}-empty.png`, fullPage: true });
  }
});
