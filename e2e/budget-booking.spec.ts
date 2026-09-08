import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Fail closed even if the component host accidentally imports a network client.
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto("/");
});
test("unbook/rebook retains spending and hides inactive obligations", async ({ page }) => {
  await expect(page.getByTestId("available")).toContainText("700");
  await page.getByRole("button", { name: "Unbook", exact: true }).click();
  await expect(page.getByTestId("available")).toContainText("1,500");
  await expect(page.getByTestId("paid")).toContainText("200");
  await expect(page.getByRole("region", { name: "Upcoming payments" })).not.toContainText("Final installment");
  await expect(page.getByText("Inactive booking.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Book / rebook" }).click();
  await expect(page.getByRole("region", { name: "Upcoming payments" })).toContainText("Final installment");
  await expect(page.getByTestId("available")).toContainText("700");
});
test("reduced commitment keeps actual paid money and exposes discrepancy", async ({ page }) => {
  await page.getByRole("button", { name: "Reduce price" }).click();
  await expect(page.getByTestId("available")).toContainText("1,500");
  await expect(page.getByText("Review payments:", { exact: false })).toContainText("recorded payments exceed");
  const form = page.getByRole("region", { name: "Edit canonical expense" });
  await expect(form.locator('[name="committedShekels"], [name="coupleVendorId"], [name="source"]')).toHaveCount(0);
  await expect(form.getByRole("spinbutton", { name: "Estimated (₪)" })).toHaveValue("1500");
  await form.getByRole("button", { name: "Save expense" }).click();
  await expect(form.getByRole("status")).toHaveText("Fixture expense saved.");
});
test("payment failure is safe and leaves the form usable", async ({ page }) => {
  const form = page.getByRole("region", { name: "Payment form" });
  await form.getByRole("textbox", { name: "Payment name" }).fill("Deposit");
  await form.getByRole("spinbutton", { name: "Amount (₪)" }).fill("100");
  await form.getByRole("button", { name: "Add payment" }).click();
  await expect(form.getByRole("status")).toContainText("could not be saved");
  await expect(form.getByRole("button", { name: "Add payment" })).toBeEnabled();
});
for (const width of [1440, 768, 390, 360]) test(`Budget controls remain usable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.getByRole("button", { name: "Unbook", exact: true }).click();
  await expect(page.locator("bdi")).toHaveText("External Studio · סטודיו");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("region", { name: "Manual expense" }).getByRole("spinbutton", { name: "Committed (₪)" })).toBeVisible();
});

test("real budget impact and attendance remain stable after the entrance", async ({ page }) => {
  const bar = page.getByRole("progressbar", { name: "Budget committed or already spent" });
  await expect(bar).toHaveAttribute("aria-valuenow", String(100000 / 170000 * 100));
  const ring = page.getByRole("img", { name: "60% attending: 6 of 10 invited guests" });
  await ring.scrollIntoViewIfNeeded();
  await expect(ring).toHaveAttribute("data-motion", "revealed");
  await expect.poll(() => ring.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
  await page.getByRole("button", { name: "Unbook", exact: true }).click();
  await expect(bar).toHaveAttribute("aria-valuenow", String(20000 / 170000 * 100));
  await expect(ring).toContainText("60%");
});

test("canonical updates receive a finite highlight and reduced motion stays quiet", async ({ page }) => {
  const expense = page.locator(".budget-expense-surface");
  expect(await expense.evaluate(element => element.getAnimations().length)).toBe(0);
  await page.getByRole("button", { name: "Reduce price", exact: true }).click();
  expect(await expense.evaluate(element => element.getAnimations().some(animation => animation.effect?.getTiming().duration === 1200))).toBe(true);
  await expect.poll(() => expense.evaluate(element => element.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Unbook", exact: true }).click();
  expect(await expense.evaluate(element => element.getAnimations().length)).toBe(0);
  const ring = page.locator(".guest-attendance-ring");
  await expect(ring).toHaveCSS("opacity", "1");
  await expect(ring).toHaveCSS("animation-name", "none");
});

for (const width of [1440, 768, 390, 360]) for (const view of ["budget", "guests"]) test(`${view} full page composition at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/pages.html?view=${view}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(view === "budget" ? "Budget & Payments" : "Your Guest List");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (view === "guests") {
    await expect(page.getByRole("img", { name: "60% attending: 6 of 10 invited guests" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Search and filter guests" })).toBeVisible();
    await expect(page.getByText("Alex and Morgan", { exact: true }).filter({ visible: true })).toHaveCount(1);
  } else {
    await expect(page.locator(".budget-metric")).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "Cedar Photography", exact: true })).toBeVisible();
  }
  await page.screenshot({ path: `.codex-tmp/phase2b-review/${view}-${width}.png`, fullPage: true });
});
