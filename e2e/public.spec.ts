import { expect, test } from "@playwright/test";

test("landing page exposes the three entry paths", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /your wedding/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan our wedding" })).toBeVisible();
  await expect(page.getByRole("link", { name: "I'm a vendor" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore as guest" })).toBeVisible();
});

test("guest can browse the seeded marketplace preview and a vendor profile", async ({ page }) => {
  await page.goto("/vendors?category=photography-content");
  await expect(page.getByRole("heading", { name: "Find the right people." })).toBeVisible();
  await expect(page.getByText("88 vendors", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(12);
  await expect(page.getByText("Page 1 of 8", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Dawn Photography Collective/i })).toBeVisible();

  await page.goto("/vendors/dawn-photography-collective-01");
  await expect(page.getByRole("heading", { name: "Dawn Photography Collective" })).toBeVisible();
  await expect(page.getByText(/documentary coverage/i).first()).toBeVisible();
  const cover = page.getByRole("img", { name: /Dawn Photography Collective/i });
  await expect(cover).toBeVisible();
  await expect(cover).toHaveAttribute("src", /\/demo-vendors\/dawn-photography-collective-01\.svg$/);
  await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
});

test("marketplace filtering and pagination use the expanded fallback dataset", async ({ page }) => {
  await page.goto("/vendors?subcategory=videographers");
  await expect(page.getByText("22 vendors", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(12);
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/subcategory=videographers.*page=2|page=2.*subcategory=videographers/);
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(10);

  await page.goto("/vendors?category=photography-content&service=Drone&area=south");
  const resultCount = await page.locator("article").count();
  expect(resultCount).toBeGreaterThan(0);
  expect(resultCount).toBeLessThanOrEqual(12);
});

test("private Couple route redirects to sign in when Supabase is not configured", async ({ page }) => {
  await page.goto("/wedding");
  await expect(page).toHaveURL(/\/auth\/couple/);
  await expect(page.getByRole("heading", { name: /keep the beautiful parts/i })).toBeVisible();
});
