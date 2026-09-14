import { expect, test } from "@playwright/test";

test("Couple account-type navigation preserves login and signup mode", async ({ page }) => {
  await page.goto("/");
  const publicNavigation = page.getByRole("navigation", { name: "Public navigation", exact: true });
  await expect(publicNavigation.getByRole("link", { name: "Log in", exact: true })).toHaveAttribute("href", "/auth/couple?mode=login");
  await publicNavigation.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/couple\?mode=login$/);
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();

  const vendorLink = () => page.getByRole("link", { name: "I’m a vendor", exact: true });
  await expect(vendorLink()).toHaveAttribute("href", "/auth/vendor?mode=login");
  await vendorLink().click();
  await expect(page).toHaveURL(/\/auth\/vendor\?mode=login$/);
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create your business account", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();

  await page.goto("/auth/couple?mode=signup");
  await expect(page.getByRole("heading", { name: "Create your shared space", exact: true })).toBeVisible();
  await expect(vendorLink()).toHaveAttribute("href", "/auth/vendor?mode=signup");
  await vendorLink().click();
  await expect(page).toHaveURL(/\/auth\/vendor\?mode=signup$/);
  await expect(page.getByRole("heading", { name: "Create your business account", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create your business account", exact: true })).toBeVisible();
});

test("Couple and Vendor login expose the shared forgot-password flow", async ({ page }) => {
  for (const audience of ["couple", "vendor"] as const) {
    await page.goto(`/auth/${audience}?mode=login`);
    const link = page.getByRole("link", { name: "Forgot password?", exact: true });
    await expect(link).toHaveAttribute("href", `/auth/forgot-password?audience=${audience}`);
    await link.click();
    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    const navigation = page.locator(".public-desktop-nav");
    await expect(navigation.getByRole("link", { name: "How it works" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Vendors", exact: true })).toBeVisible();
    await expect(navigation.getByRole("button", { name: "About us" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /AI Assistant/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Log in" })).toHaveAttribute("href", `/auth/${audience}?mode=login`);
    await expect(navigation.getByRole("link", { name: "Sign up", exact: true })).toHaveAttribute("href", `/auth/${audience}?mode=signup`);
    await expect(page.getByRole("link", { name: "Return to Login" })).toHaveAttribute("href", `/auth/${audience}?mode=login`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/forgot-password?audience=vendor");
  await page.getByLabel("Navigation menu", { exact: true }).click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation.getByRole("link", { name: "How it works" })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Vendors", exact: true })).toBeVisible();
  await expect(mobileNavigation.getByRole("button", { name: "About us" })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: /AI Assistant/ })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/auth/vendor?mode=login");
  await expect(mobileNavigation.getByRole("link", { name: "Sign up", exact: true })).toHaveAttribute("href", "/auth/vendor?mode=signup");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("invalid and expired recovery links use a safe branded recovery state", async ({ page }) => {
  for (const issue of ["invalid", "expired"] as const) {
    await page.goto(`/auth/reset-password?issue=${issue}&audience=couple`);
    await expect(page.getByRole("heading", { name: issue === "expired" ? "This reset link has expired" : "This reset link is not valid" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new reset link" })).toHaveAttribute("href", "/auth/forgot-password?audience=couple");
    await expect(page.getByRole("link", { name: "Return to Login" })).toHaveAttribute("href", "/auth/couple?mode=login");
  }
});

test("recovery confirmation stays fail-closed when its token or session is unavailable", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=scanner-safe-token&type=recovery");
  await expect(page.getByRole("heading", { name: "Continue password recovery" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to reset password" })).toBeVisible();

  await page.goto("/auth/confirm?type=recovery");
  await expect(page).toHaveURL(/\/auth\/confirm\?type=recovery$/);
  await expect(page.getByRole("heading", { name: "This confirmation link is not valid" })).toBeVisible();

  await page.goto("/auth/reset-password?issue=unavailable");
  await expect(page.getByRole("heading", { name: "Password recovery is temporarily unavailable" })).toBeVisible();
  await expect(page.getByText("secure password-recovery session", { exact: false })).toBeVisible();
  await expect(page.getByText("invalid, expired or has already been used", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
});

test("password recovery states fit supported mobile widths", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    for (const route of ["/auth/forgot-password?audience=vendor", "/auth/reset-password?issue=expired&audience=vendor"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const control of await page.locator("main input:not([type=hidden]), main button, main a.ea-button").all()) {
        if (!await control.isVisible()) continue;
        const box = await control.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});
