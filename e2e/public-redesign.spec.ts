import { expect, test } from "@playwright/test";

test("public entry links lead to the existing account and guest flows", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Plan our wedding", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/couple$/);
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create your shared space" })).toBeVisible();
  await page.goto("/");
  await page.locator(".hero-vendor").getByRole("link").click();
  await expect(page).toHaveURL(/\/auth\/vendor$/);
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create your business account" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("navigation", { name: "Public navigation", exact: true }).getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/couple\?mode=login$/);
  await page.goto("/");
  await page.getByRole("navigation", { name: "Public navigation", exact: true }).getByRole("link", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/couple$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Explore vendors", exact: true }).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.getByText("496 vendors", { exact: true })).toBeVisible();
});

test("the original category icons use real marketplace filters and preserve search/pagination", async ({ page }) => {
  test.setTimeout(90_000);
  const categories = [
    ["Wedding Venues & Gardens", "venues", 36],
    ["Photography & Content", "photography-content", 88],
    ["Music & Entertainment", "music-entertainment", 66],
    ["Beauty & Attire", "beauty-attire", 66],
    ["Design & Flowers", "design-flowers", 88],
    ["Event Services", "event-services", 88],
  ] as const;
  for (const [label, slug, count] of categories) {
    await page.goto("/vendors");
    await page.getByRole("navigation", { name: "Browse vendor categories" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`category=${slug}#marketplace-results$`));
    await expect(page.locator("input[name=category]")).toHaveValue(slug);
    await expect(page.getByText(`${count} vendors`, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
  await page.goto("/vendors?category=photography-content");
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/category=photography-content.*page=2/);
  await page.getByRole("textbox", { name: "Search vendors" }).fill("Dawn");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Dawn Photography Collective" })).toBeVisible();
});

test("desktop homepage preserves the approved composition and real feature pillars", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/");
  await expect(page.locator(".hero-photo")).toHaveJSProperty("complete", true);
  await expect.poll(() => page.locator(".hero-photo").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const header = (await page.locator("header").boundingBox())!;
  const hero = (await page.locator(".landing-hero").boundingBox())!;
  expect(header.height).toBe(64);
  expect(hero.width).toBe(1536);
  expect(hero.height).toBe(510);
  const columns = await page.locator(".pillar").evaluateAll(elements => elements.map(el => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(columns).size).toBe(1);
  for (const name of ["Plan with ease", "Find the perfect vendors", "Stay on track", "AI Wedding Assistant"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "How it works", exact: true }).first().click();
  await expect(page).toHaveURL(/#how-it-works$/);
});

test("iPhone-sized public pages have accessible menus, stacked CTAs and no overflow", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const menu = page.getByLabel("Navigation menu", { exact: true });
  await expect.poll(() => page.locator(".hero-photo").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(menu).toBeVisible();
  // Escape is a progressive enhancement; wait for the client bundle before testing it.
  await expect(page.locator(".public-mobile-menu")).toHaveAttribute("data-enhanced", "true");
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.locator(".public-mobile-menu")).not.toHaveAttribute("open");
  const buttons = await page.locator(".hero-actions a").evaluateAll(elements => elements.map(el => ({ top: el.getBoundingClientRect().top, left: el.getBoundingClientRect().left, height: el.getBoundingClientRect().height })));
  expect(buttons[1].top).toBeGreaterThan(buttons[0].top + buttons[0].height);
  expect(buttons[0].left).toBe(buttons[1].left);
  await menu.click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Vendors", exact: true }).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeHidden();
  await expect.poll(() => page.locator(".category-link").evaluateAll(elements => elements.length === 8 && elements.every(el => el.getBoundingClientRect().width >= 44 && el.getBoundingClientRect().height >= 44))).toBe(true);
  const categoryBoxes = await page.locator(".category-link").evaluateAll(elements => elements.map(el => ({ top: Math.round(el.getBoundingClientRect().top), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
  expect(new Set(categoryBoxes.map(box => box.top)).size).toBe(4);
  expect(categoryBoxes.every(box => box.width >= 44 && box.height >= 44)).toBe(true);
  for (const width of [320, 390, 430, 768, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/", "/vendors"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test("mobile navigation remains usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Navigation menu", { exact: true }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Vendors", exact: true }).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.getByText("496 vendors", { exact: true })).toBeVisible();
  await context.close();
});
