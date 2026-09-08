import { expect, test } from "@playwright/test";

test("real pending state stays pending until the operation settles, then permits another request", async ({ page }) => {
  const external: string[] = [];
  page.on("request", request => { if (!request.url().startsWith("http://127.0.0.1:3108")) external.push(request.url()); });
  await page.goto("/");
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByLabel("Primary email", { exact: true }).fill("fixture@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("fixture-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("button", { name: "Signing in…", exact: true })).toBeDisabled();
    await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
    const sweep = await page.locator(".couple-auth-submit").evaluate(el => getComputedStyle(el, "::after").animationName);
    expect(sweep).toBe("ea-skeleton-sweep");
    await page.getByRole("button", { name: "Resolve fixture request" }).click();
    await expect(page.getByRole("alert")).toHaveText("Please check your email and password and try again.");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  }
  expect(external).toEqual([]);
});

test("reduced motion preserves pending/error feedback without shimmer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByLabel("Primary email", { exact: true }).fill("fixture@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Signing in…", exact: true })).toBeDisabled();
  expect(await page.locator(".couple-auth-submit").evaluate(el => getComputedStyle(el, "::after").animationName)).toBe("none");
  await page.getByRole("button", { name: "Resolve fixture request" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});
