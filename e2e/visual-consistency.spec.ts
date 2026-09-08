import { expect, test } from "@playwright/test";

test("all four real auth views use the approved brand and retain usable forms", async ({ page }) => {
  test.setTimeout(90_000);
  for (const audience of ["couple", "vendor"]) {
    for (const mode of ["signup", "login"]) {
      await page.goto(`/auth/${audience}?mode=${mode}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".auth-panel")).toBeVisible();
      await expect(page.getByRole("img", { name: "Ever After", exact: true })).toBeVisible();
      await expect(page.getByLabel("Primary email", { exact: true })).toHaveAttribute("type", "email");
      await expect(page.getByLabel(/^Password/)).toHaveAttribute("type", "password");
      await expect(page.getByRole("button", { name: mode === "signup" ? "Create account" : "Sign in", exact: true })).toBeVisible();
      expect(await page.locator("form").evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
      await expect(page.locator('a[href="/vendors"]').first()).toHaveAttribute("href", "/vendors");
      if (mode === "signup") await expect(page.getByLabel("Confirm password", { exact: true })).toBeVisible();
    }
  }
});

test("auth callback failure uses the shared branded recovery destination", async ({ page }) => {
  await page.goto("/auth/callback", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/verification\?issue=invalid/);
  await expect(page.getByRole("alert")).toContainText("This link is invalid, expired or has already been used.");
});

test("the existing not-found response uses Ever After presentation without changing its status", async ({ page }) => {
  const response = await page.goto("/page-that-does-not-exist", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "A little off the path." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
});

test("mobile auth and editorial vendor profiles remain readable without horizontal overflow", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/vendors", { waitUntil: "domcontentloaded" });
  const profileHref = await page.locator(".vendor-card a").first().getAttribute("href");
  expect(profileHref).toBeTruthy();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/auth/couple", "/auth/vendor?mode=login", "/vendors", profileHref!]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (route.startsWith("/auth")) {
        const inputs = await page.locator("input:not([type=hidden])").evaluateAll(elements => elements.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, fontSize: parseFloat(getComputedStyle(el).fontSize) })));
        expect(inputs.every(input => input.width >= 150 && input.height >= 44 && input.fontSize >= 16)).toBe(true);
      }
    }
  }
});

test("all private routes retain real authentication guards in disconnected mode", async ({ request }) => {
  const coupleRoutes = ["/wedding", "/wedding/details", "/wedding/setup", "/wedding/timeline", "/tasks", "/budget", "/assistant", "/settings", "/vendors/my"];
  const vendorRoutes = ["/vendor", "/vendor/profile", "/vendor/settings", "/vendor/explore"];
  for (const [audience, routes] of [["couple", coupleRoutes], ["vendor", vendorRoutes]] as const) {
    for (const route of routes) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect([302, 303, 307, 308]).toContain(response.status());
      expect(response.headers().location).toContain(`/auth/${audience}`);
    }
  }
});
