import { expect, test } from "@playwright/test";

test("invalid and expired links retain the known audience, with neutral recovery otherwise", async ({ page }) => {
  for (const audience of ["couple", "vendor"]) {
    await page.goto(`/auth/callback?error=access_denied&error_code=otp_expired&audience=${audience}`);
    await expect(page.getByRole("heading", { name: "This verification link has expired" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to log in" })).toHaveAttribute("href", `/auth/${audience}?mode=login`);
    await expect(page.getByRole("link", { name: "Back to sign up" })).toHaveAttribute("href", `/auth/${audience}`);
    await expect(page.getByRole("button", { name: "Resend verification email" })).toBeVisible();
  }
  await page.goto("/auth/callback?audience=untrusted&next=//example.com");
  await expect(page).toHaveURL(/\/auth\/verification\?issue=invalid$/);
  await expect(page.getByLabel("Account type")).toBeVisible();
  await expect(page.getByRole("link", { name: "Couple log in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vendor log in" })).toBeVisible();
});

test("verification recovery fits desktop and mobile without changing the auth design", async ({ page }, testInfo) => {
  for (const [width, height] of [[1440, 900], [390, 844], [360, 800]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/auth/verification?audience=couple");
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Ever After", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await page.getByLabel("Email address").boundingBox();
    expect(bounds!.width).toBeGreaterThan(200);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: testInfo.outputPath(`verification-${width}.png`), fullPage: true });
  }
});

test("unresolved profiles offer login recovery without pretending to create an account", async ({ page }) => {
  await page.goto("/auth/verification?issue=profile&audience=vendor");
  await expect(page.getByRole("heading", { name: "Your account needs a moment" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to log in" })).toHaveAttribute("href", "/auth/vendor?mode=login");
  await expect(page.getByRole("button", { name: "Resend verification email" })).toHaveCount(0);
});
