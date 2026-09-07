import { test, expect } from "@playwright/test";
const cards = ["Our Tasks", "Upcoming", "Our Vendors", "Budget", "Guest List", "Wedding Assistant"];
const discarded = ["Tasks needing attention", "Payment deadlines", "Your booked vendors", "Guest confirmations", "Details to check"];
const states = [
  ["previewDaysBefore=8", "NORMAL", "8 days until your celebration"],
  ["previewDaysBefore=7", "FINAL_WEEK", "7 days to go"],
  ["previewDaysBefore=3", "FINAL_WEEK", "3 days to go"],
  ["previewDaysBefore=1", "DAY_BEFORE", "Tomorrow"],
  ["previewDaysBefore=0", "WEDDING_DAY", "Today is the day"],
  ["previewDaysAfter=1", "POST_WEDDING", "Just married"],
] as const;
test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.clock.install({ time: new Date("2026-09-07T12:00:00Z") });
});
for (const width of [1440, 1280, 1024, 768, 390, 375, 360]) test(`date-only celebration at ${width}`, async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 });
  let originalCards = "";
  for (const [query, phase, label] of states) {
    await page.goto(`/?${query}`);
    const date = page.getByLabel("Wedding date and countdown");
    await expect(date).toHaveAttribute("data-phase", phase);
    await expect(date.getByText(label, { exact: true })).toBeVisible();
    await expect(date.getByText(/Development preview/)).toBeVisible();
    for (const name of cards) await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(1);
    for (const name of discarded) await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    const cardContent = await page.locator(".wedding-overview").innerText();
    if (!originalCards) originalCards = cardContent; else expect(cardContent).toBe(originalCards);
    await expect(page.getByText(/-\d+ days/)).toHaveCount(0);
    if (["FINAL_WEEK", "DAY_BEFORE"].includes(phase)) await expect(date.getByText(/\d+h \d+m/)).toBeVisible();
    else await expect(date.getByText(/until your wedding day/)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await date.boundingBox(); expect(box!.height).toBeLessThan(260);
    const details = page.getByRole("link", { name: "Edit wedding details", exact: true });
    await details.focus(); await expect(details).toBeFocused();
    await page.screenshot({ path: test.info().outputPath(`${phase}-${query}-${width}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});
test("no-date ignores preview; minute clock crosses wedding-day boundary without data writes", async ({ page }) => {
  await page.goto("/?noDate=1&previewDaysBefore=0");
  const date = page.getByLabel("Wedding date and countdown");
  await expect(date).toHaveAttribute("data-phase", "NO_DATE");
  await expect(date.getByText("Wedding date not set yet")).toBeVisible();
  await expect(date.getByText(/Development preview/)).toHaveCount(0);
  await page.clock.setSystemTime(new Date("2026-09-11T20:59:00Z")); // isolated browser clock only
  await page.goto("/");
  await expect(date).toHaveAttribute("data-phase", "DAY_BEFORE");
  await expect(date.getByText(/00h 01m/)).toBeVisible();
  await page.clock.runFor(60000);
  await expect(date).toHaveAttribute("data-phase", "WEDDING_DAY");
  await expect(date.getByText("Today is the day")).toBeVisible();
  await expect(date.getByText(/until your wedding day/)).toHaveCount(0);
  for (const name of cards) await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(1);
});
