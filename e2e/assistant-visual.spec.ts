import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const output = ".codex-tmp/phase2e-review";
const threadId = "00000000-0000-4000-8000-000000000003";
test.beforeEach(async ({ page }) => {
  mkdirSync(output, { recursive: true });
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.route("**/api/assistant", (route) => route.fulfill({ status: 500, json: { errorCode: "MESSAGE_NOT_SAVED" } }));
});

test("blank entry, history selection and new chat preserve separate conversations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/?blank&shell");
  await expect(page.getByRole("heading", { name: "Where shall we start?" })).toBeVisible();
  await expect(page.locator("[data-bubble]")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveValue("auto");
  await page.screenshot({ path: `${output}/blank-1440.png`, fullPage: true });
  await page.getByRole("button", { name: "Our wedding plans", exact: true }).click();
  await expect(page.locator("[data-bubble]")).toHaveCount(5);
  await page.screenshot({ path: `${output}/conversation-1440.png`, fullPage: true });
  await page.getByRole("button", { name: "Budget and the next steps", exact: false }).click();
  await expect(page.locator("[data-bubble]")).toHaveCount(1);
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  await expect(page.locator("[data-bubble]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Our wedding plans", exact: true })).toBeVisible();
  // Suggestions compose, never create a conversation without explicit send.
  await page.getByRole("button", { name: "How much budget do we have left?", exact: true }).click();
  await expect(page.locator("textarea")).toHaveValue("How much budget do we have left?");
  await expect(page.locator("[data-bubble]")).toHaveCount(0);
});

test("real pending ornament, context, accepted send and response reveal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/?blank&shell");
  let release: (() => void) | undefined;
  await page.route("**/api/assistant", async (route) => {
    expect(route.request().postDataJSON().threadId).toBeNull();
    await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill({ json: { threadId, message: { id: "new-answer", role: "assistant", content: "You have ₪42,000 available in your recorded budget.", source_labels: ["Couple data"], created_at: "2026-09-08" } } });
  });
  await page.locator("textarea").fill("How much budget do we have left?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("✦❦✦Considering your wedding…");
  await expect(page.locator("textarea")).toHaveValue("How much budget do we have left?");
  await expect(page.locator("textarea")).toBeDisabled();
  await expect(page.locator(".assistant-context li")).toHaveCount(5);
  const delays = await page.locator(".assistant-context li").evaluateAll((items) => items.map((item) => getComputedStyle(item).animationDelay));
  expect(delays).toEqual(["0s", "0.1s", "0.2s", "0.3s", "0.4s"]);
  await page.screenshot({ path: `${output}/pending-context-1440.png`, fullPage: true });
  await expect.poll(() => !!release).toBe(true); release!();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveValue("");
  await expect(page.locator("[data-role=assistant]")).toContainText("42,000");
  await expect(page.getByRole("list", { name: "Answer sources" })).toContainText("Couple data");
  await page.screenshot({ path: `${output}/response-1440.png`, fullPage: true });
});

test("responsive sweep includes intermediate layouts and accessible conversation panel", async ({ page }) => {
  test.setTimeout(150000);
  for (const width of [320, 360, 390, 430, 480, 540, 600, 640, 700, 768, 820, 1023, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto("/?blank&shell");
    await expect(page.locator("textarea")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator("textarea, select, .assistant-send, .assistant-suggestions button").evaluateAll((items) => items.every((item) => { const r = item.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width >= 44 && r.height >= 44; }))).toBe(true);
    await page.screenshot({ path: `${output}/blank-${width}.png`, fullPage: true });
    if (width < 1024) {
      await expect(page.locator(".assistant-history")).toBeHidden();
      await page.getByRole("button", { name: "Conversations", exact: true }).click();
      const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
      const rect = await dialog.boundingBox(); expect(rect!.width).toBeLessThan(width);
      if (width === 390) await page.screenshot({ path: `${output}/drawer-390.png`, fullPage: true });
      await page.keyboard.press("Escape"); await expect(dialog).toBeHidden();
      await expect(page.getByRole("button", { name: "Conversations", exact: true })).toBeFocused();
      await page.getByRole("button", { name: "Conversations", exact: true }).click();
      await dialog.getByRole("button", { name: "Our wedding plans", exact: true }).click();
      await expect(dialog).toBeHidden();
    } else await page.getByRole("button", { name: "Our wedding plans", exact: true }).click();
    await expect(page.locator("[data-bubble]")).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${output}/chat-${width}.png`, fullPage: true });
  }
});

test("missing context, safe errors, empty history and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 1000 }); await page.goto("/?blank&empty&noContext");
  await expect(page.locator(".assistant-blank")).toHaveCSS("opacity", "1");
  await expect(page.locator(".assistant-blank")).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "Conversations", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Your conversations will find a home here.");
  await page.screenshot({ path: `${output}/empty-history-390.png`, fullPage: true });
  await page.keyboard.press("Escape");
  await page.locator("textarea").fill("What is our budget?"); await page.locator("textarea").press("Control+Enter");
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await expect(page.locator("textarea")).toHaveValue("What is our budget?");
  await expect(page.locator(".assistant-context")).toHaveCount(0);
  await page.screenshot({ path: `${output}/error-390.png`, fullPage: true });
  await page.goto("/?blank&unavailable"); await expect(page.locator("textarea")).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("could not be accessed");
});


test("stale history cannot replace New chat; history failures stay safe", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/?blank&holdHistory");
  await page.getByRole("button", { name: "Our wedding plans", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Opening your conversations");
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("release-history")));
  await expect(page.getByRole("heading", { name: "Where shall we start?" })).toBeVisible();
  await expect(page.locator("[data-bubble]")).toHaveCount(0);
  await page.goto("/?blank&historyError");
  await page.getByRole("button", { name: "Our wedding plans", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("could not be accessed");
  await expect(page.locator("[data-bubble]")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.getByRole("button", { name: "Conversations", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Our wedding plans", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("could not be accessed");
});

test.use({ video: { mode: "on", size: { width: 1440, height: 1000 } } });
test.describe("motion review", () => {
  test("finite reveals and pending-only ornament, with reduced-motion final state", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/?blank&shell");
    // Observation intervals are test-only: production never delays a response for animation.
    await page.waitForTimeout(900);
    let release: (() => void) | undefined;
    await page.route("**/api/assistant", async (route) => {
      await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: { threadId, message: { id: "motion-answer", role: "assistant", content: "Your wedding details and recorded plans are ready to explore.", source_labels: ["Couple data", "General guidance"], created_at: "2026-09-08" } } });
    });
    await page.locator("textarea").fill("What should we focus on this week?");
    await page.locator("textarea").press("Control+Enter");
    await expect(page.getByRole("status")).toContainText("Considering your wedding");
    await page.waitForTimeout(2700);
    expect(await page.locator(".assistant-pending-ornament span").first().evaluate(el => getComputedStyle(el).animationIterationCount)).toBe("infinite");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".assistant-pending-ornament span").first()).toHaveCSS("animation-name", "none");
    for (const chip of await page.locator(".assistant-context li").all()) await expect(chip).toHaveCSS("opacity", "1");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    release!();
    await expect(page.locator(".assistant-pending-ornament")).toHaveCount(0);
    await expect(page.locator("[data-role=assistant]")).toContainText("ready to explore");
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "New chat", exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Our wedding plans", exact: true }).click();
    await page.waitForTimeout(900);
    await page.close();
    await page.video()!.saveAs(`${output}/assistant-motion.webm`);
  });
});
