import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
const threadId = "00000000-0000-4000-8000-000000000001";
test.beforeEach(async ({ page }) => {
  // A closed local component host: every API response is mocked; block external requests.
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.route("**/api/assistant", (route) => route.fulfill({ status: 500, json: { error: "UNEXPECTED_UNMOCKED_REQUEST" } }));
});
for (const width of [1440, 1280, 1024, 768, 390, 375, 360]) for (const language of ["he", "en"]) {
  test(`${language} conversation, direction and controls at ${width}`, async ({ page }) => {
    const crashes: string[] = []; page.on("pageerror", (error) => crashes.push(error.message));
    await page.setViewportSize({ width, height: 1000 }); await page.goto(`/?lang=${language}`);
    const input = page.locator("textarea"); await expect(input).toHaveAttribute("dir", "auto");
    await page.getByRole("combobox").selectOption(language);
    const text = language === "he" ? "מה ה-budget שנשאר לנו?" : "What is our remaining budget?";
    await input.fill(text); await expect(input).toHaveCSS("direction", language === "he" ? "rtl" : "ltr");
    await expect(page.locator('[data-role="assistant"]').first()).toHaveCSS("justify-content", "flex-start");
    await expect(page.locator('[data-role="user"]').first()).toHaveCSS("justify-content", "flex-end");
    const paragraphs = page.locator(".assistant-markdown");
    const directions = await paragraphs.evaluateAll((elements) => elements.map((element) => ({ text: element.textContent, direction: getComputedStyle(element).direction })));
    expect(directions.some((item) => /[א-ת]/.test(item.text ?? "") && item.direction === "rtl")).toBe(true);
    expect(directions.some((item) => /These are|You have|Questions for/.test(item.text ?? "") && item.direction === "ltr")).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator("[data-bubble], textarea, select, button, [data-bubble] li").evaluateAll((elements) => elements.filter((element) => { const r = element.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 2; }).map((element) => element.tagName))).toEqual([]);
    await page.getByRole("log").evaluate((element) => { element.scrollTop = 0; });
    mkdirSync("test-results/assistant-visual", { recursive: true });
    await page.screenshot({ path: `test-results/assistant-visual/${language}-${width}.png`, fullPage: true });
    await input.focus(); await expect(input).toBeFocused();
    await page.route("**/api/assistant", async (route) => { expect(route.request().postDataJSON().requestedLanguage).toBe(language); await route.fulfill({ json: { threadId, message: { id: "answer", role: "assistant", content: language === "he" ? "נותרו 2,000 ₪ בתקציב שלכם." : "You have ₪2,000 available.", source_labels: ["Couple data"], created_at: "2026-09-07" } } }); });
    await input.press("Control+Enter"); await expect(page.locator('[data-role="assistant"]').last()).toContainText("2,000"); await expect(input).toBeFocused();
    expect(crashes).toEqual([]);
  });
}
test("safe errors, loading, clarification and proven-unsaved retry", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 1000 });
  await page.goto("/?lang=he"); await page.getByRole("combobox").selectOption("he");
  const input = page.locator("textarea");
  let release: (() => void) | undefined;
  await page.route("**/api/assistant", async (route) => { await new Promise<void>((resolve) => { release = resolve; }); await route.fulfill({ status: 503, json: { threadId, error: "SQL STACK PRIVATE_SECRET", agent: { status: "unavailable", text: "Not verified", evidence: [], error: { code: "RESEARCH_UNAVAILABLE", retryable: false }, clarificationIntent: { required: true, missingFields: [{ field: "coverageHours", questionIntent: "define_package", reason: "package_comparability" }] } } } }); });
  await input.fill("הצלם הציע 2,000 ₪, זה מחיר טוב?"); await page.getByRole("button", { name: "שליחת הודעה", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible(); await expect(page.getByRole("button", { name: "שליחת הודעה", exact: true })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true); release!();
  await expect(page.getByRole("alert")).toContainText("איני יכול לאמת"); await expect(page.getByText("כמה שעות צילום כלולות?")).toBeVisible(); await expect(page.locator("body")).not.toContainText("PRIVATE_SECRET");
  await expect(input).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/assistant-visual/he-clarification-360.png", fullPage: true });
  await page.route("**/api/assistant", (route) => route.fulfill({ status: 500, json: { errorCode: "MESSAGE_NOT_SAVED", threadId, error: "TECHNICAL_INTERNAL" } }));
  await input.fill("מה המשימות שלי?"); await input.press("Control+Enter"); await expect(page.getByRole("button", { name: "ניסיון נוסף" })).toBeVisible(); await expect(input).toHaveValue("מה המשימות שלי?");
  await page.route("**/api/assistant", (route) => route.fulfill({ json: { threadId, message: { id: "bad", role: "assistant", content: "", source_labels: [], created_at: "2026-09-07" } } }));
  await page.getByRole("button", { name: "ניסיון נוסף" }).click(); await expect(page.getByRole("alert")).toContainText("לא הצלחתי"); await expect(page.locator("body")).not.toContainText("TECHNICAL_INTERNAL");
});
