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
  await expect(page.getByLabel("Account type")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resend verification email" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Couple log in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vendor log in" })).toBeVisible();
});

test("verification recovery fits desktop and mobile without changing the auth design", async ({ page }, testInfo) => {
  const spamNotice = "Important: The verification email may arrive in your Spam or Junk folder. Check those folders if needed.";
  const browserInstruction = "If you requested more than one email, use the link in the newest one. For verification to work correctly, open it in this same browser.";
  for (const [width, height] of [[1440, 900], [768, 900], [390, 844], [360, 800]]) {
    await page.setViewportSize({ width, height });
    for (const audience of ["couple", "vendor"]) {
      await page.goto(`/auth/verification?audience=${audience}`);
      await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
      await expect(page.getByRole("img", { name: "Ever After", exact: true })).toBeVisible();
      const notice = page.getByRole("note");
      await expect(notice).toHaveText(spamNotice);
      await expect(page.getByText(browserInstruction, { exact: true })).toBeVisible();
      await expect(page.getByText("Check your spam folder too. Open the latest link in the same browser where you requested it.", { exact: true })).toHaveCount(0);
      expect(Number(await notice.evaluate(element => getComputedStyle(element).fontWeight))).toBeGreaterThanOrEqual(600);
      expect(parseFloat(await notice.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
      await expect(page.getByRole("button", { name: "Resend verification email" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to log in" })).toHaveAttribute("href", `/auth/${audience}?mode=login`);
      await expect(page.getByRole("link", { name: "Back to sign up" })).toHaveAttribute("href", `/auth/${audience}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const fieldBounds = (await page.getByLabel("Email address").boundingBox())!;
      const buttonBounds = (await page.getByRole("button", { name: "Resend verification email" }).boundingBox())!;
      expect(fieldBounds.width).toBeGreaterThan(200);
      expect(fieldBounds.height).toBeGreaterThanOrEqual(44);
      expect(Math.abs(fieldBounds.x - buttonBounds.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(fieldBounds.width - buttonBounds.width)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`verification-${audience}-${width}.png`), fullPage: true });
    }
  }
});

test("unresolved profiles offer login recovery without pretending to create an account", async ({ page }) => {
  await page.goto("/auth/verification?issue=profile&audience=vendor");
  await expect(page.getByRole("heading", { name: "Your account needs a moment" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to log in" })).toHaveAttribute("href", "/auth/vendor?mode=login");
  await expect(page.getByRole("button", { name: "Resend verification email" })).toHaveCount(0);
});

test("token confirmation GET and HEAD are prefetch-safe and malformed input stays fail-closed", async ({ page, request }) => {
  const scannerHead = await request.head("/auth/confirm?token_hash=scanner-safe-token&type=email");
  expect(scannerHead.ok()).toBe(true);

  await page.goto("/auth/confirm?token_hash=scanner-safe-token&type=email");
  await expect(page).toHaveURL(/\/auth\/confirm\?token_hash=scanner-safe-token&type=email$/);
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify email and continue" })).toBeVisible();
  await expect(page.getByLabel("Account type")).toHaveCount(0);

  await page.goto("/auth/confirm?type=email");
  await expect(page).toHaveURL(/\/auth\/confirm\?type=email$/);
  await expect(page.getByRole("heading", { name: "This confirmation link is not valid" })).toBeVisible();
  await expect(page.getByLabel("Account type")).toHaveCount(0);

  await page.goto("/auth/verification?issue=unavailable");
  await expect(page.getByRole("heading", { name: "Verification is temporarily unavailable" })).toBeVisible();
  await expect(page.getByText("We could not verify this link right now.", { exact: false })).toBeVisible();
  await expect(page.getByText("This link is invalid, expired or has already been used.", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Account type")).toHaveCount(0);
});
