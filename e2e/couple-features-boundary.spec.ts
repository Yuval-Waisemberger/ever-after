import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1440, height: 1000 },
  { width: 1280, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 360, height: 800 },
];

for (const viewport of viewports) {
  test(`Marketplace remains public and external vendors remain private at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/vendors", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Find the people behind/ })).toBeVisible();
    await expect(page.locator('[data-vendor-source="external"]')).toHaveCount(0);
    await expect(page.getByText("Added by you", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Add external vendor/i })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const clipped = await page.locator("button, input:not([type=hidden]), select, textarea, h1, .vendor-card").evaluateAll((elements) => elements.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
    }).map((element) => element.tagName));
    expect(clipped).toEqual([]);
  });
}

test("Couple-owned feature routes retain the authentication boundary", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const page = await context.newPage();
  for (const route of ["/wedding", "/settings", "/vendors/my"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/couple/);
    await expect(page.getByRole("status")).toContainText("Please sign in to continue");
  }
  await context.close();
});
