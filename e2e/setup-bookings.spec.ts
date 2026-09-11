import { designSweep } from "./helpers/design-sweep";
import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto("/");
});
const photographer = (page: import("@playwright/test").Page) => page.locator("details").filter({ has: page.locator("summary > span", { hasText: /^Photographer$/ }) });
test("declaration is not a vendor; resolving it shows a real booking and Budget link", async ({ page }) => {
  test.setTimeout(60_000);
  const section = photographer(page); await section.locator("summary").click();
  await section.getByRole("button", { name: "Add details later", exact: true }).click();
  await expect(section.locator("summary")).toContainText("Already arranged");
  await expect(page.getByLabel("Booking creates")).toHaveText("0");
  await section.getByRole("button", { name: "Search Ever After", exact: true }).click();
  const input = section.getByRole("combobox", { name: "Vendor name or city" });
  await input.fill("a"); await expect(section.locator('[role="option"]')).toHaveCount(0);
  await input.fill("alma"); await expect(section.locator('[role="option"]')).toHaveCount(6);
  await input.press("ArrowDown"); await input.press("ArrowDown"); await input.press("Enter");
  await expect(section.getByRole("status").filter({ hasText: "Selected:" })).toContainText("Studio 2");
  await expect(page.getByLabel("Booking creates")).toHaveText("0");
  await section.getByLabel("Agreed price (₪), optional").fill("1200");
  await section.getByRole("button", { name: "Confirm booking" }).click();
  await expect(section.locator("summary")).toContainText("Booked");
  await expect(page.getByLabel("Selected vendor ID")).toHaveText("vendor-2");
  await expect(page.getByLabel("Booking price")).toHaveText("1200");
  await expect(section.getByRole("link", { name: "Open Budget" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Confirm booking" })).toBeDisabled();
  await page.getByRole("button", { name: "Save Wedding Details" }).click();
  await expect(page.getByText("Wedding Details changed since this form opened. Reload before saving.", { exact: true })).toBeVisible();
});
test("External creation needs no contacts and uncertain outcome cannot be replayed", async ({ page }) => {
  const section = photographer(page); await section.locator("summary").click();
  await section.getByRole("button", { name: "Add external vendor", exact: true }).click();
  await section.getByRole("textbox", { name: "Business name", exact: true }).fill("Uncertain");
  await section.getByRole("button", { name: "Confirm booking" }).click();
  await expect(section.getByRole("alert")).toContainText("uncertain");
  await expect(section.getByRole("button", { name: "Confirm booking" })).toBeDisabled();
});
test("validation returns to the failing step, focuses input and preserves the draft", async ({ page }) => {
  const wizard = page.locator(".setup-wizard");
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await wizard.getByLabel("Estimated guests").fill("99999");
  for (let i = 0; i < 3; i++) await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await wizard.getByRole("button", { name: "Finish setup" }).click();
  await expect(wizard.getByLabel("Estimated guests")).toBeVisible();
  await expect(wizard.getByLabel("Estimated guests")).toHaveValue("99999");
  await expect(wizard.getByLabel("Estimated guests")).toBeFocused();
  await expect(wizard.getByRole("alert").last()).toContainText("1–5,000");
  await wizard.getByRole("button", { name: "Skip for now" }).click();
  await expect(wizard.getByText("Skipped without saving unsaved fields.")).toBeVisible();
});
test("Skip database failure is visible and keeps the wizard usable", async ({ page }) => {
  await page.getByRole("button", { name: "Simulate skip failure" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByText("Setup could not be skipped. Please try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip for now" })).toBeEnabled();
});
for (const width of [1440, 768, 390, 360]) test(`booking controls fit ${width}px`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 950 });
  const section = photographer(page); await section.locator("summary").click();
  await section.getByRole("button", { name: "Search Ever After", exact: true }).click();
  await section.getByRole("combobox", { name: "Vendor name or city" }).fill("alma");
  await expect(section.locator('[role="option"]')).toHaveCount(6);
  await section.getByRole("listbox").screenshot({ path: test.info().outputPath(`typeahead-${width}.png`) });
  const dropdown = await section.getByRole("listbox").boundingBox();
  const card = await section.boundingBox();
  expect(dropdown!.x).toBeGreaterThanOrEqual(card!.x);
  expect(dropdown!.x + dropdown!.width).toBeLessThanOrEqual(card!.x + card!.width);
  expect((await section.locator('[role="option"]').first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.locator('[role="option"]').first().click();
  await expect(section.getByRole("status").filter({ hasText: "Selected:" })).toBeVisible();
  await expect(page.getByLabel("Booking creates")).toHaveText("0");
  await page.goto("/?view=details");
  const arranged = page.getByRole("region", { name: "Arranged vendors" });
  const arrangedList = page.getByRole("region", { name: "Arranged vendor types" });
  const save = page.getByRole("button", { name: "Save Wedding Details" });
  await expect(save).toHaveCount(1);
  const metrics = await arrangedList.evaluate(element => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY }));
  expect(metrics.overflowY).toBe("auto");
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect((await arranged.boundingBox())!.y + (await arranged.boundingBox())!.height).toBeLessThan((await save.boundingBox())!.y);
  await arrangedList.focus();
  await expect(arrangedList).toBeFocused();
  await arrangedList.evaluate(element => element.scrollTop = element.scrollHeight);
  await expect(arranged.locator("details").last()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath(`wedding-details-${width}.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("autocomplete ignores stale results, handles empty results and closes with Escape", async ({ page }) => {
  const section = photographer(page); await section.locator("summary").click();
  await section.getByRole("button", { name: "Search Ever After", exact: true }).click();
  const input = section.getByRole("combobox", { name: "Vendor name or city" });
  await input.fill("al"); await expect(section.getByRole("status")).toContainText("Searching");
  await input.fill("alma"); await expect(section.locator('[role="option"]').first()).toContainText("Alma");
  await page.waitForTimeout(1000);
  await expect(section.locator('[role="option"]').first()).toContainText("Alma");
  await input.press("ArrowUp"); await expect(input).toHaveAttribute("aria-activedescendant", /-5$/);
  await input.press("Escape"); await expect(section.getByRole("listbox")).toHaveCount(0);
  await input.fill("zz"); await expect(section.getByText("No matching vendors", { exact: true })).toBeVisible();
  await expect(section.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
  await expect(section.getByRole("button", { name: "Confirm booking" })).toBeDisabled();
});

test("touch selection keeps booking explicit", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto("/");
  const section = photographer(page); await section.locator("summary").tap();
  await section.getByRole("button", { name: "Search Ever After", exact: true }).tap();
  await section.getByRole("combobox", { name: "Vendor name or city" }).fill("alma");
  await section.locator('[role="option"]').first().tap();
  await expect(section.getByRole("status").filter({ hasText: "Selected:" })).toBeVisible();
  await expect(page.getByLabel("Booking creates")).toHaveText("0");
  await expect(section.getByRole("button", { name: "Confirm booking" })).toBeEnabled();
  await context.close();
});

test("setup progress follows entered details, not navigation or repeated choice clicks", async ({ page }) => {
  const wizard = page.locator(".setup-wizard");
  const progress = wizard.getByRole("progressbar", { name: "Setup details added" });
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await wizard.getByRole("checkbox", { name: "Elegant", exact: true }).check();
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await wizard.getByRole("checkbox", { name: "Romantic", exact: true }).check();
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await wizard.getByRole("checkbox", { name: "Elegant", exact: true }).uncheck();
  await wizard.getByRole("checkbox", { name: "Romantic", exact: true }).uncheck();
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await wizard.getByRole("button", { name: "Back", exact: true }).click();
  await wizard.getByRole("button", { name: "Back", exact: true }).click();
  await wizard.getByLabel("Wedding date").fill("2027-04-16");
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
});

test("reduced motion keeps setup steps and choice feedback visible without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const wizard = page.locator(".setup-wizard");
  await expect(wizard.getByRole("heading", { name: "Let’s begin with your plans" })).toBeVisible();
  expect(await wizard.locator(".setup-step-intro").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  expect(await wizard.locator(".setup-progress__fill").evaluate(node => getComputedStyle(node).transitionDuration)).toBe("0s");
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await wizard.getByRole("checkbox", { name: "Elegant", exact: true }).check();
  await expect(wizard.getByRole("checkbox", { name: "Elegant", exact: true })).toBeChecked();
});


test("final design intermediate-width sweep", async ({ page }) => {
  test.setTimeout(240000);
  await designSweep(page, { setup: "/?shell", details: "/?view=details&shell" });
});
