import { test, expect, type Page } from "@playwright/test";
import vendors from "../src/generated/marketplace-demo.json";

async function expectListing(page: Page, count: number, label?: string) {
  await expect(page.locator(".marketplace-summary")).toContainText(`${count} ${count === 1 ? "vendor" : "vendors"}`);
  await expect(page.locator(".vendor-card")).toHaveCount(Math.min(count, 12));
  if (label) {
    for (const card of await page.locator(".vendor-card").all()) await expect(card.locator(".p-5 > div:first-child > div > p")).toHaveText(label);
  }
  if (process.env.EVER_AFTER_CONNECTED_CHECK === "1") await expect(page.locator(".marketplace-preview")).toHaveCount(0);
}

test("real subcategory selector filters Photography and Design while preserving category totals", async ({ page }) => {
  test.setTimeout(180_000);
  for (const category of ["photography-content", "design-flowers"]) {
    await page.goto(`/vendors?category=${category}`);
    await expectListing(page, 88);
    const choices = [...new Map(vendors.filter(v => v.categorySlug === category).map(v => [v.subcategorySlug, v.subcategoryName])).entries()];
    await expect(page.getByRole("combobox", { name: "Subcategory", exact: true }).locator("option")).toHaveCount(5);
    for (const [slug, name] of choices) {
      await page.getByRole("combobox", { name: "Subcategory", exact: true }).selectOption(slug);
      await page.getByRole("button", { name: "Apply", exact: true }).click();
      await expectListing(page, 22, name);
    }
  }
});

test("new product categories remain top-level, searchable, and independently filterable", async ({ page }) => {
  test.setTimeout(180_000);
  for (const category of ["cakes-desserts", "wedding-accessories-party-extras"]) {
    await page.goto(`/vendors?category=${category}`);
    await expectListing(page, 32);
    const choices = [...new Map(vendors.filter(v => v.categorySlug === category).map(v => [v.subcategorySlug, v.subcategoryName])).entries()];
    expect(choices).toHaveLength(4);
    await expect(page.getByRole("combobox", { name: "Subcategory", exact: true }).locator("option")).toHaveCount(5);
    for (const [slug, name] of choices) {
      await page.getByRole("combobox", { name: "Subcategory", exact: true }).selectOption(slug);
      await page.getByRole("button", { name: "Apply", exact: true }).click();
      await expectListing(page, 8, name);
    }
    const searchable = vendors.find(vendor => vendor.categorySlug === category)!;
    await page.goto(`/vendors?category=${category}&search=${encodeURIComponent(searchable.businessName)}`);
    await expectListing(page, 1, searchable.subcategoryName);
    await expect(page.getByRole("heading", { name: searchable.businessName, exact: true })).toBeVisible();
  }
  await page.goto("/vendors?category=music-entertainment");
  await expectListing(page, 66);
  await expect(page.getByRole("combobox", { name: "Subcategory", exact: true }).locator('option[value="glow-accessories"]')).toHaveCount(0);
});

test("subcategory pagination retains filters and changing category clears stale subcategory", async ({ page }) => {
  await page.goto("/vendors?category=photography-content&subcategory=wedding-photographers");
  await expectListing(page, 22, "Wedding Photographers");
  const firstNames = await page.locator(".vendor-card h2").allTextContents();
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.locator(".vendor-card")).toHaveCount(10);
  await expect(page.getByRole("navigation", { name: "Marketplace pagination" })).toContainText("Page 2 of 2");
  expect(new URL(page.url()).searchParams.get("subcategory")).toBe("wedding-photographers");
  expect((await page.locator(".vendor-card h2").allTextContents()).every(name => !firstNames.includes(name))).toBe(true);
  await page.getByRole("navigation", { name: "Browse vendor categories" }).getByRole("link", { name: "Design & Flowers" }).click();
  await expect(page.getByRole("combobox", { name: "Subcategory", exact: true })).toHaveValue("");
  await page.getByRole("combobox", { name: "Subcategory", exact: true }).selectOption("flowers");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expectListing(page, 22, "Flowers");
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
});

test("subcategory composes with area, service, search and price", async ({ page }) => {
  const photos = vendors.filter(v => v.subcategorySlug === "wedding-photographers");
  for (const area of ["central_israel", "north"]) {
    const expected = photos.filter(v => v.serviceAreas.includes(area) || v.serviceAreas.includes("flexible"));
    await page.goto(`/vendors?subcategory=wedding-photographers&area=${area}`);
    await expectListing(page, expected.length, "Wedding Photographers");
  }
  const service = photos[0].services[0];
  const expected = photos.filter(v => v.services.includes(service) && v.minPriceMinor <= 1000000);
  expect(expected.length).toBeGreaterThan(0);
  await page.goto(`/vendors?category=photography-content&subcategory=wedding-photographers&service=${encodeURIComponent(service)}&maxPrice=10000`);
  await expectListing(page, expected.length, "Wedding Photographers");
  await page.getByRole("textbox", { name: "Search vendors" }).fill(expected[0].businessName);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expectListing(page, 1, "Wedding Photographers");
});

test("area filtering uses physical area for fixed Vendors and service coverage for mobile Vendors", async ({ page }) => {
  for (const area of ["central_israel", "north"]) {
    const fixed = vendors.filter(v => v.subcategorySlug === "wedding-venues" && v.physicalArea === area);
    await page.goto(`/vendors?subcategory=wedding-venues&area=${area}`);
    await expectListing(page, fixed.length, "Wedding Venues & Gardens");

    const mixed = vendors.filter(v => v.locationMode === "fixed"
      ? v.physicalArea === area
      : v.serviceAreas.includes(area) || v.serviceAreas.includes("flexible"));
    await page.goto(`/vendors?area=${area}`);
    await expectListing(page, mixed.length);
  }
});

test("invalid area parameters are ignored and location rows remain responsive", async ({ page }) => {
  await page.goto("/vendors?area=not-a-region");
  await expectListing(page, vendors.length);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = vendors.find(v => v.locationMode === "mobile" && v.locationCity && v.serviceAreas.length > 1)!;
  await page.goto(`/vendors?search=${encodeURIComponent(mobile.businessName)}`);
  const mobileCard = page.locator(".vendor-card");
  await expect(mobileCard.getByText(`${mobile.locationCity}, Israel`, { exact: true })).toBeVisible();
  await expect(mobileCard.getByText(/Serves:/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const fixed = vendors.find(v => v.locationMode === "fixed")!;
  await page.goto(`/vendors?search=${encodeURIComponent(fixed.businessName)}`);
  const fixedCard = page.locator(".vendor-card").filter({ has: page.getByRole("heading", { name: fixed.businessName, exact: true }) });
  await expect(fixedCard.getByText("Serves:")).toHaveCount(0);
});

test("unknown and incompatible subcategories do not leak other vendors", async ({ page }) => {
  for (const query of ["subcategory=not-a-subcategory", "category=venues&subcategory=wedding-photographers"]) {
    await page.goto(`/vendors?${query}`);
    await expectListing(page, 0);
  }
});

test("mobile selector fits and remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/vendors?category=photography-content");
  const selector = page.getByRole("combobox", { name: "Subcategory", exact: true });
  await selector.selectOption("videographers");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expectListing(page, 22, "Videographers");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await selector.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
