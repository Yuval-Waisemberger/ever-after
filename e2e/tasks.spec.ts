import { designSweep } from "./helpers/design-sweep";
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.clock.setFixedTime(new Date("2026-09-07T12:00:00Z"));
});
for (const width of [1440, 768, 390, 360]) test(`workflow and deadline, forms and timeline at ${width}`, async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width, height: 1000 }); await page.goto("/");
  const row = page.getByRole("region", { name: "Task list", exact: true }).locator("article").first();
  await expect(row.locator(".ea-status-pill").filter({ hasText: /^Waiting on vendor$/ })).toBeVisible();
  await expect(row.getByText("Overdue 2 days", { exact: true })).toBeVisible();
  const timeline = page.getByRole("region", { name: "Timeline", exact: true });
  await expect(timeline.getByText("Overdue 2 days", { exact: true })).toBeVisible();
  await expect(timeline.getByText("Undated contract response")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath(`tasks-initial-${width}.png`), fullPage: true });
  const form = page.getByRole("region", { name: "Add task", exact: true });
  await form.getByLabel("Task", { exact: true }).fill("Photographer contract");
  const statusControl = form.getByRole("combobox", { name: "Status", exact: true });
  await statusControl.focus(); await statusControl.press("Home"); await statusControl.press("ArrowDown"); await statusControl.press("ArrowDown");
  await expect(statusControl).toHaveValue("waiting_on_vendor"); await expect(statusControl).toBeFocused();
  await form.getByLabel("Due date (optional)").fill("2026-09-07");
  await form.getByRole("button", { name: "Add task", exact: true }).click();
  const created = page.locator("article").filter({ has: page.getByRole("heading", { name: "Photographer contract", exact: true }) });
  await expect(created.locator(".ea-status-pill").filter({ hasText: /^Waiting on vendor$/ })).toBeVisible();
  // Record finite surface animations at their start; a slow runner may assert after they end.
  await created.evaluate(element => element.addEventListener("animationstart", event => {
    if (event.target === element) element.setAttribute("data-observed-motion", (event as AnimationEvent).animationName);
  }));
  await created.getByRole("button", { name: "Complete Photographer contract" }).click();
  await expect(created.locator(".ea-status-pill")).toHaveText(["Completed"]);
  await expect(created).toHaveAttribute("data-observed-motion", "task-settle");
  await created.getByRole("button", { name: "Reopen Photographer contract" }).click();
  await expect(created.locator(".ea-status-pill").filter({ hasText: /^Not started$/ })).toBeVisible();
  await expect(created).toHaveAttribute("data-observed-motion", "task-reopen-surface");
  await created.locator("summary").click();
  await created.getByRole("combobox", { name: "Status", exact: true }).selectOption("in_progress");
  await created.getByRole("button", { name: "Save changes" }).click();
  await expect(created.locator(".ea-status-pill").first()).toHaveText("In progress");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`tasks-${width}.png`), fullPage: true });
  await created.getByRole("button", { name: "Delete Photographer contract" }).click(); await expect(created).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("status and category intersect; errors preserve drafts and remain readable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Filter tasks by status" }).getByRole("link", { name: "Waiting on vendor" }).click();
  await page.getByRole("navigation", { name: "Filter tasks by category" }).getByRole("link", { name: "Venue", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Toggle simulated failure" }).click();
  const row = page.locator("article"); await row.getByRole("button", { name: /^Complete/ }).click();
  await expect(row.getByRole("alert")).toContainText("could not be changed");
  await expect(row).not.toHaveAttribute("data-task-motion");
  const form = page.getByRole("region", { name: "Add task", exact: true });
  await form.getByLabel("Task", { exact: true }).fill("Preserved title");
  await form.getByLabel("Notes (optional)").fill("x".repeat(3001));
  await form.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(form.getByLabel("Task", { exact: true })).toHaveValue("Preserved title");
  await expect(form.getByLabel("Notes (optional)")).toHaveValue("x".repeat(3001));
});

test("bounded list retains every task and reduced motion keeps the final state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const form = page.getByRole("region", { name: "Add task", exact: true });
  for (let index = 1; index <= 7; index++) {
    await form.getByLabel("Task", { exact: true }).fill(`Additional task ${index}`);
    await form.getByRole("button", { name: "Add task", exact: true }).click();
    await expect(page.getByRole("region", { name: "Task list", exact: true }).locator("article")).toHaveCount(index + 2);
  }
  const list = page.getByRole("region", { name: "Task list", exact: true });
  expect(await list.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  const last = list.locator("article").last();
  await last.scrollIntoViewIfNeeded();
  await expect(last.getByRole("heading", { name: "Additional task 7" })).toBeVisible();
  await last.getByRole("button", { name: "Complete Additional task 7" }).click();
  await expect(last).toHaveAttribute("data-status", "completed");
  expect(await last.locator(".task-title-text").evaluate(element => getComputedStyle(element, "::after").animationName)).toBe("none");
  expect(await last.locator(".task-title-text").evaluate(element => getComputedStyle(element).textDecorationLine)).toBe("line-through");
});


test("final design intermediate-width sweep", async ({ page }) => {
  test.setTimeout(240000);
  await designSweep(page, { tasks: "/?shell" });
});
