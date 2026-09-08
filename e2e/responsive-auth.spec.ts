import { expect, test, devices } from "@playwright/test";

const viewports = [
  { width: 1440, height: 1000 }, { width: 1280, height: 900 },
  { width: 768, height: 1024 }, { width: 390, height: 844 },
  { width: 375, height: 812 }, { width: 360, height: 800 },
];

for (const viewport of viewports) {
  test(`real public pages adapt at ${viewport.width}x${viewport.height}`, async ({ browser }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      ...(viewport.width < 500 ? devices["iPhone 13"] : {}),
      viewport,
      baseURL: testInfo.project.use.baseURL,
    });
    const page = await context.newPage();
    await page.goto("/vendors");
    const profile = await page.locator(".vendor-card a").first().getAttribute("href");
    expect(profile).toBeTruthy();
    for (const route of ["/", "/auth/couple", "/auth/couple?mode=login", "/auth/vendor", "/auth/vendor?mode=login", "/vendors", "/vendors?category=venues", profile!]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const clipped = await page.locator("input:not([type=hidden]), select, textarea, button, h1, .category-link, .vendor-card").evaluateAll(elements => elements.filter(el => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.left < -1 || box.right > innerWidth + 1);
      }).map(el => el.tagName + ": " + el.textContent?.slice(0, 50)));
      expect(clipped, route).toEqual([]);
      for (const image of await page.locator(".auth-image img, .hero-photo, .vendor-profile-image img, .vendor-card img").all()) {
        if (!await image.isVisible()) continue;
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { message: `Image loads on ${route} at ${viewport.width}px` }).toBe(true);
        expect(await image.evaluate(el => getComputedStyle(el).objectFit)).toBe("cover");
      }
      if (route.startsWith("/auth")) {
        for (const control of await page.locator("input:not([type=hidden]), button[type=submit]").all()) {
          await control.scrollIntoViewIfNeeded();
          await expect(control).toBeInViewport();
          const dimensions = await control.evaluate(el => ({ height: el.getBoundingClientRect().height, fontSize: parseFloat(getComputedStyle(el).fontSize) }));
          expect(dimensions.height).toBeGreaterThanOrEqual(44);
          if (await control.evaluate(el => el.tagName === "INPUT")) expect(dimensions.fontSize).toBeGreaterThanOrEqual(16);
        }
      }
      if (route.startsWith("/auth/vendor")) {
        await expect(page.getByRole("heading", { name: "Your Work. Their Perfect Day.", exact: true })).toBeVisible();
        const planner = page.getByRole("img", { name: "Wedding planner reviewing reception preparations" });
        await expect(planner).toBeVisible();
        expect(decodeURIComponent((await planner.getAttribute("src"))!)).toContain("/demo-marketplace/event-managers/event-managers-01.webp");
        const imageBox = await planner.boundingBox();
        const formBox = await page.locator(".auth-panel").boundingBox();
        if (viewport.width <= 900) expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(formBox!.y);
        else expect(imageBox!.x + imageBox!.width).toBeLessThan(formBox!.x);
      }
      if (route === "/auth/couple") {
        const image = page.getByRole("img", { name: "Wedding rings on two hands resting together on ivory fabric" });
        await expect(image).toBeVisible();
        expect(decodeURIComponent((await image.getAttribute("src"))!)).toContain("/images/auth/hands-and-rings.webp");
        expect(await image.evaluate(el => getComputedStyle(el).filter)).toBe("none");
        await expect(page.getByText("Everything before your ever after", { exact: true })).toBeVisible();
        await expect(page.getByText("Your Next Chapter Starts Here.", { exact: true })).toBeVisible();
        for (const [label, name] of [["First Partner's Name", "partnerOneName"], ["Second Partner's Name", "partnerTwoName"], ["First Partner's Phone (optional)", "partnerOnePhone"], ["Second Partner's Phone (optional)", "partnerTwoPhone"]]) {
          await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("name", name);
        }
        const photoBox = await image.boundingBox();
        const panelBox = await page.locator(".auth-panel").boundingBox();
        if (viewport.width <= 900) expect(photoBox!.y + photoBox!.height).toBeLessThanOrEqual(panelBox!.y);
        else expect(photoBox!.x + photoBox!.width).toBeLessThan(panelBox!.x);
        if (viewport.width < 640) {
          const first = await page.getByLabel("First Partner's Name", { exact: true }).boundingBox();
          const second = await page.getByLabel("Second Partner's Name", { exact: true }).boundingBox();
          expect(second!.y).toBeGreaterThan(first!.y + first!.height);
          expect(first!.width).toBeGreaterThan(viewport.width * .7);
        }
      }
      if (viewport.width < 500 && route === "/") {
        await page.getByLabel("Navigation menu", { exact: true }).click();
        await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Vendors", exact: true }).click();
        await expect(page).toHaveURL(/\/vendors$/);
        await page.goto("/");
      }
      if ((viewport.width === 390 && ["/", "/auth/couple", "/vendors"].includes(route)) || (viewport.width === 1440 && route === "/auth/couple")) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        const label = route === "/" ? "homepage" : route === "/vendors" ? "marketplace" : "couple-signup";
        await page.screenshot({ path: `.codex-tmp/approved-auth-${label}-${viewport.width}.png`, fullPage: true, scale: "css" });
      }
      if ([390, 1440].includes(viewport.width) && (route.startsWith("/auth/vendor") || route === profile)) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        const label = route === profile ? "profile" : route.includes("login") ? "vendor-login" : "vendor-signup";
        await page.screenshot({ path: `.codex-tmp/repetition-review/${label}-${viewport.width}.png`, fullPage: true, scale: "css" });
      }
    }
    // Real category selection, search and pagination remain functional on small screens.
    await page.goto("/vendors");
    await page.locator('.category-link[href*="photography-content"]').click();
    await expect(page).toHaveURL(/category=photography-content/);
    await page.getByRole("link", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await page.getByRole("textbox", { name: "Search vendors" }).fill("Golden Photography Atelier");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page.locator(".vendor-card")).toHaveCount(1);
    await expect(page.locator(".vendor-card")).toContainText("Golden Photography Atelier");
    await context.close();
  });
}

test("public layouts survive resizing across their actual breakpoints", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/vendors");
  const profile = await page.locator(".vendor-card a").first().getAttribute("href");
  expect(profile).toBeTruthy();
  for (const route of ["/", "/auth/couple", "/auth/couple?mode=login", "/auth/vendor", "/auth/vendor?mode=login", "/vendors", "/vendors?category=photography-content", profile!]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    for (const width of [500, 639, 640, 641, 699, 700, 701, 767, 769, 899, 900, 901, 1023, 1024, 1025, 1150]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: `${route} at ${width}px` }).toBe(true);
      const outside = await page.locator("input:not([type=hidden]), select, textarea, button, h1, .category-link, .vendor-card").evaluateAll(elements => elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
      }).map(el => el.tagName));
      expect(outside, `${route} at ${width}px`).toEqual([]);
    }
  }
});
