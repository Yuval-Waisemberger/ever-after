import { expect, test } from "@playwright/test";

test("Couple and Vendor login expose the shared forgot-password flow", async ({ page }) => {
  for (const audience of ["couple", "vendor"] as const) {
    await page.goto(`/auth/${audience}?mode=login`);
    const link = page.getByRole("link", { name: "Forgot password?", exact: true });
    await expect(link).toHaveAttribute("href", `/auth/forgot-password?audience=${audience}`);
    await link.click();
    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to Login" })).toHaveAttribute("href", `/auth/${audience}?mode=login`);
  }
});

test("invalid and expired recovery links use a safe branded recovery state", async ({ page }) => {
  for (const issue of ["invalid", "expired"] as const) {
    await page.goto(`/auth/reset-password?issue=${issue}&audience=couple`);
    await expect(page.getByRole("heading", { name: issue === "expired" ? "This reset link has expired" : "This reset link is not valid" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new reset link" })).toHaveAttribute("href", "/auth/forgot-password?audience=couple");
    await expect(page.getByRole("link", { name: "Return to Login" })).toHaveAttribute("href", "/auth/couple?mode=login");
  }
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
