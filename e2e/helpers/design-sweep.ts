import { expect, type Page } from "@playwright/test";

// Include the requested intermediate widths and both sides of shared breakpoints.
export const designWidths = [320, 360, 390, 430, 480, 540, 600, 620, 639, 640, 700, 767, 768, 820, 900, 1023, 1024, 1080, 1280, 1440];

export async function designSweep(page: Page, routes: Record<string, string>) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [name, route] of Object.entries(routes)) {
    await page.goto(route);
    await expect(page.locator("main").first()).toBeVisible();
    for (const width of designWidths) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `${name} overflows at ${width}px` }).toBe(true);
      const clipped = await page.locator("main button, main input:not([type=hidden]), main select, main textarea").evaluateAll(controls => controls.filter(control => {
        const r = control.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(control).visibility === "hidden") return false;
        // Intentional scrollable tabs/carousels are assessed by their own interaction tests.
        for (let parent = control.parentElement; parent; parent = parent.parentElement) {
          if (["auto", "scroll"].includes(getComputedStyle(parent).overflowX)) return false;
          if (parent.tagName === "DIALOG" && !parent.hasAttribute("open")) return false;
        }
        return r.left < -1 || r.right > innerWidth + 1;
      }).map(control => control.getAttribute("aria-label") || control.getAttribute("name") || control.textContent?.trim()));
      expect(clipped, `${name} clipped controls at ${width}px`).toEqual([]);
      if ([1440, 768, 390, 360].includes(width)) await page.screenshot({ path: `.codex-tmp/final-design/screenshots/${name}-${width}.png`, fullPage: true, animations: "disabled" });
    }
  }
}
