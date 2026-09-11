import { designSweep } from "./helpers/design-sweep";
import { test, expect } from "@playwright/test";

test("record date-derived countdown and scroll-driven Timeline", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1024, height: 850 }, recordVideo: { dir: ".codex-tmp/final-design/motion/raw" } });
  const page = await context.newPage();
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto("/?previewDaysBefore=8&shell");
  await expect(page.locator(".countdown-day-value .planning-value > span")).toHaveText("8");
  await page.goto("/?timeline&shell");
  const path = page.locator(".planning-timeline-path");
  await expect(path).toBeVisible();
  const progress = () => path.evaluate(element => Number((element as HTMLElement).style.getPropertyValue("--timeline-progress")));
  const start = await progress();
  expect(start).toBeLessThan(1);
  await page.locator(".planning-timeline-path > li").nth(4).scrollIntoViewIfNeeded();
  await page.waitForTimeout(800); // Recording dwell only, to show scroll progression.
  const destination = page.locator(".timeline-destination");
  await destination.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600); // Include the full heart/sparkle reveal in the review clip.
  await expect.poll(progress).toBe(1);
  await expect(destination.locator(".planning-reveal")).toHaveAttribute("data-reveal", "shown");
  await expect(destination.locator(".timeline-destination-surface > span svg")).toHaveClass(/lucide-calendar-heart/);
  await expect(destination.getByRole("heading", { name: "Your Wedding Day", exact: true })).toBeVisible();
  await context.close();
  await page.video()!.saveAs(".codex-tmp/final-design/motion/countdown-timeline.webm");
});
const cards = ["Our Tasks", "Upcoming", "Our Vendors", "Budget", "Guest List", "Wedding Assistant"];
const discarded = ["Tasks needing attention", "Payment deadlines", "Your booked vendors", "Guest confirmations", "Details to check"];
test("Wedding Day sparkle is date-only, finite and static under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?previewDaysBefore=0");
  const spark = page.locator(".wedding-day-spark");
  await expect(spark).toHaveCount(1);
  await expect(spark).toHaveCSS("animation-duration", "1.6s");
  await expect(spark).toHaveCSS("animation-iteration-count", "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(spark).toHaveCSS("animation-name", "none");
  await expect(spark).toBeVisible();
  await page.goto("/?previewDaysBefore=3");
  await expect(spark).toHaveCount(0);
});
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-09-07T12:00:00Z") });
});
for (const width of [1440, 1280, 1024, 768, 390, 375, 360]) test(`date-only celebration at ${width}`, async ({ page }) => {
  test.setTimeout(90000); // Six complete state navigations and screenshots per viewport.
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 });
  let originalCards = "";
  for (const [query, phase, label] of states) {
    // Match the real route: the approved Dashboard is always inside AppShell.
    await page.goto(`/?${query}&shell`);
    const date = page.getByLabel("Wedding date and countdown");
    await expect(date).toHaveAttribute("data-phase", phase);
    if (phase === "NORMAL") await expect(date.getByLabel(label, { exact: true })).toBeVisible();
    else await expect(date.getByText(label, { exact: true })).toBeVisible();
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
  await expect(page.locator(".dashboard-wedding-date")).toHaveText("Wedding date not set yet");
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

for (const width of [1440, 768, 390, 360]) test(`Timeline follows scroll at ${width}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/?timeline=1");
  const path = page.locator(".planning-timeline-path");
  await expect(path).toBeVisible();
  const progress = () => path.evaluate(el => Number((el as HTMLElement).style.getPropertyValue("--timeline-progress")));
  const start = await progress();
  expect(start).toBeLessThan(1);
  await page.locator(".timeline-destination").scrollIntoViewIfNeeded();
  // Native scroll delivery and the mocked animation clock are separate queues.
  // Wait for observable progress, advancing frames without changing production motion.
  await expect.poll(async () => {
    await page.clock.runFor(100);
    return progress();
  }).toBeGreaterThan(start);
  await expect(page.locator(".timeline-destination .planning-reveal")).toHaveAttribute("data-reveal", "shown");
  await expect(page.getByRole("heading", { name: "Your Wedding Day", exact: true })).toHaveCount(1);
  await expect(page.getByText("Waiting on vendor").first()).toHaveCount(1);
  const reached = await progress();
  await page.evaluate(() => scrollTo(0, 0)); await page.clock.runFor(300);
  expect(await progress()).toBe(reached);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(200);
  await page.screenshot({ path: test.info().outputPath(`timeline-${width}.png`), fullPage: true });
});
test("countdown eases to the actual value once, accessible amount stays final", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?previewDaysBefore=8");
  const count = page.locator(".countdown-day-value .planning-value");
  await expect(count).toHaveAttribute("aria-label", "8");
  await page.clock.runFor(2500);
  await expect(count).toHaveText("8");
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.evaluate(() => scrollTo(0, 0)); await page.clock.runFor(200);
  await expect(count).toHaveText("8");
  await page.goto("/?details=updated");
  await expect(page.getByRole("status")).toHaveText(/Wedding details saved/);
  await page.clock.runFor(2900); await expect(page.getByRole("status")).toHaveCount(0);
});


test("final design intermediate-width sweep", async ({ page }) => {
  test.setTimeout(240000);
  await designSweep(page, { dashboard: "/?previewDaysBefore=3&shell", timeline: "/?timeline&shell" });
});
