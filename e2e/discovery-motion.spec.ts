import { designSweep } from "./helpers/design-sweep";
import {expect,test} from "@playwright/test";

test("record the successful booking burst in the closed fixture", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 900, height: 700 }, recordVideo: { dir: ".codex-tmp/final-design/motion/raw" } });
  const page = await context.newPage();
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto("/?view=actions");
  await page.getByRole("button", { name: "Booked", exact: true }).click();
  await expect(page.getByText("Booked for your day!", { exact: true })).toBeVisible();
  await expect.poll(() => page.locator(".booking-confetti > span").evaluateAll(els => els.some(el => Number(getComputedStyle(el).opacity) > 0))).toBe(true);
  await expect.poll(() => page.locator(".booking-confetti > span").evaluateAll(els => els.every(el => getComputedStyle(el).opacity === "0"))).toBe(true);
  await context.close();
  await page.video()!.saveAs(".codex-tmp/final-design/motion/booking.webm");
});
test.beforeEach(async({page})=>{await page.route("**/*",route=>new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());});

for(const width of [1440,768,390,360]) test(`discovery, profile and Our Vendors at ${width}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:900});
  for(const view of ["directory","profile","my"]){await page.goto(`/?view=${view}`);await expect(page.locator("h1")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.codex-tmp/phase2c/${view}-${width}.png`,fullPage:true});}
  await page.getByRole("button",{name:"Add external vendor",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();await expect(page.getByRole("textbox",{name:"Business name"})).toBeFocused();await expect(page.getByRole("dialog")).toHaveCSS("opacity","1");await page.screenshot({path:`.codex-tmp/phase2c/dialog-${width}.png`,fullPage:true});await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).not.toBeVisible();await expect(page.getByRole("button",{name:"Add external vendor",exact:true})).toBeFocused();
});

test("compact mobile cards fit and recommendation reasons work by keyboard",async({page})=>{
  for (const width of [390,360]) {
    await page.setViewportSize({width,height:900});await page.goto("/");
    await page.getByRole("button",{name:"Compact grid"}).click();
    const summary=page.locator(".recommendation-badge");await summary.focus();await page.keyboard.press("Enter");
    await expect(page.getByText("Serves your area",{exact:true})).toBeVisible();
    await expect(page.locator(".recommendation-reasons")).toHaveCSS("opacity","1");
    expect(await page.locator(".vendor-card").evaluateAll(cards=>cards.every(card=>{
      const rating=card.querySelector(".vendor-card-rating")?.getBoundingClientRect();
      return !rating || rating.right<=card.getBoundingClientRect().right;
    }))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`.codex-tmp/phase2c/compact-${width}.png`,fullPage:true});
  }
});
test("card/category hover, real reasons, density and logged-out save",async({page})=>{
  await page.goto("/");const category=page.locator(".category-link").first();await category.hover();await expect.poll(()=>category.evaluate(el=>getComputedStyle(el).transform)).not.toBe("none");
  const card=page.locator(".vendor-card").first();await card.hover();await expect.poll(()=>card.evaluate(el=>getComputedStyle(el).transform)).not.toBe("none");
  await page.getByText("Recommended for you",{exact:true}).click();await expect(page.getByText("Serves your area",{exact:true})).toBeVisible();await expect(page.getByText("Matches your style",{exact:true})).toBeVisible();await expect(page.getByText("Fits your priorities",{exact:true})).toHaveCount(0);await page.screenshot({path:".codex-tmp/phase2c/recommendation.png",fullPage:true});
  await expect(page.getByRole("link",{name:"Sign in to save vendor"})).toHaveAttribute("href","/auth/couple?mode=login");await page.getByRole("button",{name:"Compact grid"}).click();await expect(page.locator(".marketplace-grid")).toHaveAttribute("data-density","compact");
});
test("save particles require confirmed change; failures and pending do not celebrate",async({page})=>{
  await page.goto("/?view=actions");await page.getByRole("button",{name:"Toggle pending"}).click();await page.getByRole("button",{name:"Save vendor",exact:true}).click();await expect(page.locator(".save-particles")).toHaveCount(0);await page.getByRole("button",{name:"Resolve request"}).click();await expect(page.getByRole("button",{name:"Remove from Saved Vendors"})).toHaveAttribute("aria-pressed","true");await expect(page.locator(".save-particles i")).toHaveCount(3);await expect(page.locator(".booking-celebration")).toHaveCount(0);
  await page.getByRole("button",{name:"Toggle pending"}).click();await page.getByRole("button",{name:"Remove from Saved Vendors"}).click();await expect(page.locator("[data-save-motion=unsave]")).toBeVisible();await page.getByRole("button",{name:"Toggle failure"}).click();await page.getByRole("button",{name:"Save vendor",exact:true}).click();await expect(page.locator(".save-particles")).toHaveCount(0);
});
test("booking is one finite burst after real state, with no page-load or failed celebration",async({page})=>{
  await page.goto("/?view=actions");await page.getByRole("button",{name:"Toggle failure"}).click();await page.getByRole("button",{name:"Booked",exact:true}).click();await expect(page.locator(".booking-celebration")).toHaveCount(0);await page.getByRole("button",{name:"Toggle failure"}).click();await page.getByRole("button",{name:"Toggle pending"}).click();await page.getByRole("button",{name:"Booked",exact:true}).click();await expect(page.locator(".booking-celebration")).toHaveCount(0);await page.getByRole("button",{name:"Resolve request"}).click();await expect(page.getByText("Booked for your day!",{exact:true})).toBeVisible();await expect(page.locator(".booking-confetti > span")).toHaveCount(16);await expect.poll(()=>page.locator(".booking-confetti > span").evaluateAll(els=>els.every(el=>getComputedStyle(el).opacity==="0"))).toBe(true);
  await page.getByRole("button",{name:"Toggle pending"}).click();await page.getByRole("button",{name:"Booked",exact:true}).click();await expect(page.locator(".booking-celebration")).toHaveCount(0);
  await page.reload();await page.getByRole("button",{name:"Receive unrelated booked state"}).click();await expect(page.locator(".booking-celebration")).toHaveCount(0);
});
test("reduced motion keeps success, reasons and dialog usable without particles",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/?view=actions");await page.getByRole("button",{name:"Booked",exact:true}).click();await expect(page.getByText("Booked for your day!",{exact:true})).toBeVisible();await expect(page.locator(".booking-confetti")).toBeHidden();
});

test("a failed booking intent cannot celebrate a later unrelated state update",async({page})=>{
  await page.goto("/?view=actions");await page.getByRole("button",{name:"Toggle failure"}).click();await page.getByRole("button",{name:"Booked",exact:true}).click();
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.getByRole("button",{name:"Receive unrelated booked state"}).click();await expect(page.locator(".booking-celebration")).toHaveCount(0);
});


test("final design intermediate-width sweep", async ({ page }) => {
  test.setTimeout(240000);
  await designSweep(page, { marketplace: "/", "vendor-profile": "/?view=profile", "our-vendors": "/?view=my&shell" });
});
