import { expect, test } from "@playwright/test";

for (const width of [1440, 768, 390, 360]) {
  test(`Public/Auth visual calibration at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const [name, route] of [["landing", "/"], ["login", "/auth/couple?mode=login"], ["signup", "/auth/couple"]]) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      const image = page.locator(name === "landing" ? ".hero-photo" : ".auth-image img");
      await image.evaluate((element: HTMLImageElement) => element.decode());
      if (name === "landing") {
        await expect(page.locator(".landing-hero")).toHaveAttribute("data-image-ready", "true");
        await page.locator(".hero-vendor").evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
        expect(await page.locator("h1").evaluate(el => getComputedStyle(el).textShadow)).toBe("none");
        await expect.poll(() => page.locator(".landing-petal").evaluateAll(els => els.every(el => getComputedStyle(el).opacity === "0"))).toBe(true);
        await expect(page.locator("header img, header .public-brand")).toHaveCount(0);
        await expect(page.locator(".pillar")).toHaveCount(4);
        const rows = await page.locator(".pillar").evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().top)));
        expect(new Set(rows).size).toBe(width === 1440 ? 1 : 2);
        const hero = (await page.locator(".landing-hero").boundingBox())!;
        expect(hero.height).toBe(width === 1440 ? 510 : width === 768 ? 470 : 550);
        // A wide source needs enough height for cover cropping, even on narrow screens.
        expect(await image.evaluate((el: HTMLImageElement) => el.naturalHeight)).toBeGreaterThan(hero.height * .9);
        if (width === 1440) {
          const features = (await page.locator(".landing-pillars").boundingBox())!;
          expect(features.y + features.height).toBeLessThan(825);
          expect(await page.locator("h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBe(72);
          expect((await image.boundingBox())!.width).toBe(width);
          expect(await image.evaluate(el => getComputedStyle(el).maskImage)).toBe("none");
          expect(await page.locator(".hero-media").evaluate(el => getComputedStyle(el, "::before").content)).toBe("none");
        }
        expect(await page.locator(".landing-petal").evaluateAll(els => els.filter(el => getComputedStyle(el).display !== "none").length)).toBe(width < 600 ? 8 : 12);
      } else {
        await expect(page.locator("header .auth-illustrated-brand img")).toBeVisible();
        expect(await page.locator("header .auth-illustrated-brand img").evaluate(el => getComputedStyle(el).objectFit)).toBe("contain");
        await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
        await expect(page.locator(".auth-support-strip")).toContainText("Planning with Ever After AI");
        for (const control of await page.locator("input:not([type=hidden]), button[type=submit]").all()) {
          expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        }
        const photo = (await image.boundingBox())!;
        const panel = (await page.locator(".auth-panel").boundingBox())!;
        if (width <= 900) expect(photo.y + photo.height).toBeLessThan(panel.y);
        else {
          expect(photo.x + photo.width).toBeLessThan(panel.x);
          const introduction = (await page.locator(".auth-copy").boundingBox())!;
          expect(introduction.x + introduction.width).toBeLessThan(photo.x);
          expect(photo.width).toBeGreaterThan(395);
          expect(photo.width).toBeLessThan(425);
          expect(photo.height).toBeGreaterThan(590);
          expect(photo.height).toBeLessThan(640);
          expect(photo.y).toBeCloseTo(panel.y, 1);
          expect(panel.width).toBeGreaterThan(475);
          expect(panel.width).toBeLessThan(510);
          if (name === "login") expect(panel.height).toBeLessThan(640);
        }
        if (width < 600) {
          expect(photo.height).toBeCloseTo(135, 1);
          expect(panel.y).toBeLessThan(450);
        }
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `.codex-tmp/public-auth-calibration/test-${name}-${width}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}

test("finite petals and overlapping entrance finish once, without replay on scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".landing-hero")).toHaveAttribute("data-image-ready", "true");
  await expect.poll(() => page.locator(".landing-petal").evaluateAll(els => els.some(el => Number(getComputedStyle(el).opacity) > .15))).toBe(true);
  const overlay = page.locator(".landing-petals");
  expect(await overlay.evaluate(el => el.parentElement?.classList.contains("landing-page"))).toBe(true);
  expect(await page.locator(".landing-hero .landing-petals").count()).toBe(0);
  const overlayBox = (await overlay.boundingBox())!;
  expect(overlayBox.y).toBe(0);
  expect(overlayBox.height).toBe(1000);
  expect(await overlay.evaluate(el => getComputedStyle(el).pointerEvents)).toBe("none");
  const origins = await page.locator(".landing-petal").evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).top)));
  expect(origins.some(y => y < 64)).toBe(true);
  expect(origins.filter(y => y > 574).length).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: ".codex-tmp/public-auth-review/entrance-petals-1440.png" });
  const throws = await page.locator(".landing-petal").evaluateAll(els => els.map(el => {
    const style = getComputedStyle(el);
    return { iterations: style.animationIterationCount, duration: parseFloat(style.animationDuration), delay: parseFloat(style.animationDelay),
      size: parseFloat(style.getPropertyValue("--petal-size")), blur: parseFloat(style.getPropertyValue("--petal-blur")),
      end: parseFloat(style.getPropertyValue("--petal-left")) / 100 + parseFloat(style.getPropertyValue("--petal-drift")) / innerWidth };
  }));
  expect(throws.every(petal => petal.iterations === "1" && petal.duration + petal.delay <= 3)).toBe(true);
  expect(new Set(throws.map(petal => petal.delay)).size).toBeGreaterThanOrEqual(8);
  expect(new Set(throws.map(petal => petal.duration)).size).toBeGreaterThanOrEqual(6);
  expect(Math.max(...throws.map(petal => petal.size)) / Math.min(...throws.map(petal => petal.size))).toBeGreaterThan(4);
  expect(throws.filter(petal => petal.blur > 2)).toHaveLength(3);
  expect(throws.filter(petal => petal.end > .35 && petal.end < .65).length).toBeLessThanOrEqual(2);
  const delays = await page.locator(".hero-content > *").evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).animationDelay)));
  expect(delays).toEqual([.25, .5, .85, 1.05, 1.2, 1.45, 1.6]);
  await expect(page.locator(".landing-petals")).toHaveAttribute("data-finished", "true");
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await page.locator(".hero-content").scrollIntoViewIfNeeded();
  expect(await page.locator(".landing-petal").evaluateAll(els => els.every(el => getComputedStyle(el).opacity === "0"))).toBe(true);
});

test("feature choreography repeats on a staggered score, rests and pauses offscreen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const section = page.locator(".landing-pillars");
  await expect(section).toHaveAttribute("data-motion-active", "true");
  const score = await page.locator(".feature-icon").evaluateAll(icons => icons.map(icon => {
    const motion = icon.querySelector("path")!;
    const s = getComputedStyle(motion);
    return { duration: s.animationDuration, delay: s.animationDelay, repeat: s.animationIterationCount, running: s.animationPlayState };
  }));
  expect(score.map(s => s.duration)).toEqual(["10s", "10s", "10s", "10s"]);
  expect(score.map(s => s.delay)).toEqual(["0s", "2.4s", "4.8s", "7.56s"]);
  expect(score.every(s => s.repeat === "infinite" && s.running === "running")).toBe(true);
  // Exercise the real CSS effect on the second cycle; it must not be an entrance-only pulse.
  const cycle = await page.locator(".feature-heart").evaluate(el => {
    const a = el.getAnimations()[0]; a.pause();
    const sample = (time: number) => { a.currentTime = time; const s = getComputedStyle(el); return { fill: s.fill, transform: s.transform }; };
    const active = sample(2400 + 10000 + 1400);
    const rest = sample(2400 + 10000 + 6000);
    a.play(); return { active, rest };
  });
  expect(cycle.active.fill).not.toBe(cycle.rest.fill);
  expect(cycle.active.transform).not.toBe(cycle.rest.transform);
  await page.setViewportSize({ width: 390, height: 600 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(section).toHaveAttribute("data-motion-active", "false");
  expect(await page.locator(".feature-heart").evaluate(el => getComputedStyle(el).animationPlayState)).toBe("paused");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute("data-motion-active", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".feature-icon path").evaluateAll(els => els.every(el => getComputedStyle(el).animationName === "none"))).toBe(true);
});

test("desktop and mobile Assistant gate keeps auth links, traps focus and closes with Escape", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width === 390) await page.getByLabel("Navigation menu", { exact: true }).click();
    const nav = page.getByRole("navigation", { name: width === 390 ? "Mobile navigation" : "Public navigation", exact: true });
    await nav.getByRole("link", { name: "AI Assistant Sign up to use" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Create an account", exact: true })).toHaveAttribute("href", "/auth/couple");
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("link", { name: "Already a member? Log in" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    if (width === 390) await expect(page.getByLabel("Navigation menu", { exact: true })).toBeFocused();
    else await expect(nav.getByRole("link", { name: "AI Assistant Sign up to use" })).toBeFocused();
  }
});

test("landing anchors and Vendors navigate through existing public routes", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Public navigation", exact: true });
  await nav.getByRole("link", { name: "About us", exact: true }).click();
  await expect(page).toHaveURL(/\/#about-us$/);
  await expect(page.locator("#about-title")).toBeInViewport();
  await nav.getByRole("link", { name: "How it works", exact: true }).click();
  await expect(page).toHaveURL(/\/#how-it-works$/);
  await nav.getByRole("link", { name: "Vendors", exact: true }).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.locator(".vendor-card").first()).toBeVisible();
});

test("reduced motion exposes final content, usable focus and no petals", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".landing-petals")).toBeHidden();
  for (const el of await page.locator(".hero-content > *").all()) {
    expect(Number(await el.evaluate(node => getComputedStyle(node).opacity))).toBeGreaterThanOrEqual(.8);
    expect(await el.evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  }
  await page.goto("/auth/couple?mode=login");
  await page.getByLabel("Primary email", { exact: true }).focus();
  expect(await page.getByLabel("Primary email", { exact: true }).evaluate(el => getComputedStyle(el).boxShadow)).toContain("inset");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("fixture-only-not-submitted");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("fixture-only-not-submitted");
  // No live form is submitted.
});

test("slow hero loading leaves entry links usable until the real photo is ready", async ({ page }) => {
  let release: () => void = () => {};
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/image?*hero-wide-final*", async route => { await ready; await route.continue(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Plan our wedding", exact: true })).toBeVisible();
  await expect(page.locator(".landing-hero")).toHaveAttribute("data-image-ready", "false");
  await expect(page.locator(".landing-petals")).toHaveCount(0);
  release();
  await expect(page.locator(".landing-hero")).toHaveAttribute("data-image-ready", "true");
});
