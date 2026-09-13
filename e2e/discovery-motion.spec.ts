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

test("marketplace AppShell keeps the shared compact header without Couple route CSS",async({page})=>{
  for(const width of [1023,768,390]){
    await page.setViewportSize({width,height:844});await page.goto("/?shell");
    const header=page.locator(".workspace-mobile-header"),logo=header.locator(".couple-canonical-logo img");
    await expect(header).toBeVisible();await expect(page.getByLabel("Workspace menu")).toBeVisible();
    const [headerBox,logoBox]=await Promise.all([header.boundingBox(),logo.boundingBox()]);
    expect(headerBox!.height).toBeLessThanOrEqual(84);
    expect(logoBox!.width).toBeLessThanOrEqual(width<=640?158:170);
    expect(logoBox!.x+logoBox!.width).toBeLessThan((await page.getByLabel("Workspace menu").boundingBox())!.x);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:1440,height:900});await page.goto("/?shell");
  await expect(page.locator(".workspace-mobile-header")).toBeHidden();await expect(page.locator(".workspace-sidebar")).toBeVisible();
});

test("individual Vendor profiles reuse the canonical Guest, Couple and Vendor navigation shells",async({page})=>{
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    for(const [role,query] of [["guest","&guest"],["couple",""],["vendor","&vendor"]] as const) {
      await page.goto(`/?view=profile${query}`);
      await expect(page.getByRole("heading",{name:"Willow Studio",exact:true})).toBeVisible();
      if(role === "guest") {
        await expect(page.locator(".landing-navigation.couple-auth-navigation")).toBeVisible();
        await expect(page.locator(".workspace-shell")).toHaveCount(0);
      } else {
        await expect(page.locator(".landing-navigation")).toHaveCount(0);
        await expect(page.locator(`.workspace-sidebar[data-role="${role}"]`)).toHaveCount(1);
        if(width >= 1024) await expect(page.locator(`.workspace-sidebar[data-role="${role}"]`)).toBeVisible();
        else await expect(page.locator(".workspace-mobile-header")).toBeVisible();
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
});

test("fixed subcategory survives a missing adapter mode without rendering service coverage",async({page})=>{
  await page.goto("/?view=fixed");
  const card=page.locator(".vendor-card").first();
  await expect(card.getByText(/, Israel$/).first()).toBeVisible();
  await expect(card.getByText(/Serves:/)).toHaveCount(0);
});

test("layout icons remain accessible and Apply is the final mobile filter control",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto("/");
  await expect(page.getByText("Display by",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("combobox",{name:"Display by"})).toHaveCount(0);
  const comfortable=page.getByRole("button",{name:"Comfortable cards"}),compact=page.getByRole("button",{name:"Compact grid"});
  await expect(comfortable).toHaveAttribute("aria-pressed","true");await compact.click();await expect(compact).toHaveAttribute("aria-pressed","true");
  const form=page.locator(".marketplace-filters"),apply=form.getByRole("button",{name:"Apply",exact:true}),subcategory=form.getByRole("combobox",{name:"Subcategory",exact:true});
  expect(await form.locator("input:not([type=hidden]), select, button").evaluateAll(nodes=>nodes.at(-1)?.textContent?.trim())).toBe("Apply");
  expect((await subcategory.boundingBox())!.y).toBeLessThan((await apply.boundingBox())!.y);
});

test("vendor search reserves logical space for its centered non-interactive icon",async({page})=>{
  for(const width of [1440,768,390,360]){
    await page.setViewportSize({width,height:900});await page.goto("/");
    const input=page.getByRole("textbox",{name:"Search vendors"}),icon=page.locator(".vendor-search-icon");
    const [inputBox,iconBox,padding,pointerEvents]=await Promise.all([input.boundingBox(),icon.boundingBox(),input.evaluate(el=>getComputedStyle(el).paddingInlineStart),icon.evaluate(el=>getComputedStyle(el).pointerEvents)]);
    expect(Number.parseFloat(padding)).toBeGreaterThanOrEqual(iconBox!.x+iconBox!.width-inputBox!.x+6);
    expect(Math.abs((iconBox!.y+iconBox!.height/2)-(inputBox!.y+inputBox!.height/2))).toBeLessThanOrEqual(1);
    expect(pointerEvents).toBe("none");
    await input.fill("Wedding photographer");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

for(const width of [1440,768,390,360]) test(`discovery, profile and Our Vendors at ${width}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:900});
  for(const view of ["directory","profile","my"]){await page.goto(`/?view=${view}`);await expect(page.locator("h1")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.codex-tmp/phase2c/${view}-${width}.png`,fullPage:true});}
  await page.getByRole("button",{name:"Add external vendor",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();await expect(page.getByRole("textbox",{name:"Business name"})).toBeFocused();await expect(page.getByRole("dialog")).toHaveCSS("opacity","1");await page.screenshot({path:`.codex-tmp/phase2c/dialog-${width}.png`,fullPage:true});await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).not.toBeVisible();await expect(page.getByRole("button",{name:"Add external vendor",exact:true})).toBeFocused();
});

test("compact mobile cards keep the minimal recommendation badge clear of the favorite control",async({page})=>{
  for (const width of [390,360]) {
    await page.setViewportSize({width,height:900});await page.goto("/");
    await page.getByRole("button",{name:"Compact grid"}).click();
    const badge=page.locator(".recommendation-badge");
    await expect(badge).toHaveText(/Recommended for you/);
    await expect(badge).toHaveCSS("transform","none");
    await expect(page.locator(".recommendation-reasons, details.recommendation-detail")).toHaveCount(0);
    expect(await page.locator(".vendor-card").evaluateAll(cards=>cards.every(card=>{
      const rating=card.querySelector(".vendor-card-rating")?.getBoundingClientRect();
      return !rating || rating.right<=card.getBoundingClientRect().right;
    }))).toBe(true);
    const [badgeBox,heartBox,imageBox]=await Promise.all([badge.boundingBox(),page.getByRole("link",{name:"Sign in to save vendor"}).first().boundingBox(),page.locator(".vendor-card > a > div:first-child").first().boundingBox()]);
    expect(badgeBox!.x).toBeLessThan(heartBox!.x);
    expect(badgeBox!.x).toBeGreaterThanOrEqual(imageBox!.x);
    expect(badgeBox!.y).toBeGreaterThanOrEqual(imageBox!.y);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`.codex-tmp/phase2c/compact-${width}.png`,fullPage:true});
  }
});
test("compact favorite keeps a neutral shell and toggles only the burgundy heart in both densities",async({page})=>{
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:900});await page.goto("/");
    for(const density of ["Comfortable cards","Compact grid"]){
      await page.getByRole("button",{name:density}).click();
      const badge=page.locator(".recommendation-badge").first(),recommendedCard=badge.locator("xpath=ancestor::article");
      await expect(badge).toHaveCSS("transform","none");
      const [badgeBox,recommendedHeartBox]=await Promise.all([badge.boundingBox(),recommendedCard.locator(".vendor-save-button").boundingBox()]);
      expect(badgeBox!.x+badgeBox!.width).toBeLessThanOrEqual(recommendedHeartBox!.x);
      const save=page.getByRole("button",{name:"Save vendor",exact:true}).first();
      await expect(save).toHaveAttribute("aria-pressed","false");
      const unsavedBackground=await save.evaluate(el=>getComputedStyle(el).backgroundColor);
      const unsavedHeartFill=await save.locator("svg").evaluate(el=>getComputedStyle(el).fill);
      await save.click();
      const remove=page.getByRole("button",{name:"Remove from Saved Vendors",exact:true}).first();
      await expect(remove).toHaveAttribute("aria-pressed","true");
      expect(await remove.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(unsavedBackground);
      expect(await remove.locator("svg").evaluate(el=>getComputedStyle(el).fill)).not.toBe(unsavedHeartFill);
      await remove.click();await expect(page.getByRole("button",{name:"Save vendor",exact:true}).first()).toHaveAttribute("aria-pressed","false");
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
test("card/category hover, minimal recommendation badge, density and logged-out save",async({page})=>{
  await page.goto("/");const category=page.locator(".category-link").first();await category.hover();await expect.poll(()=>category.evaluate(el=>getComputedStyle(el).transform)).not.toBe("none");
  const card=page.locator(".vendor-card").first();await card.hover();await expect.poll(()=>card.evaluate(el=>getComputedStyle(el).transform)).not.toBe("none");
  await expect(page.getByText("Recommended for you",{exact:true})).toBeVisible();await expect(page.getByText("Serves your area",{exact:true})).toHaveCount(0);await expect(page.getByText("Matches your style",{exact:true})).toHaveCount(0);await expect(page.locator(".recommendation-reasons")).toHaveCount(0);await page.screenshot({path:".codex-tmp/phase2c/recommendation.png",fullPage:true});
  await expect(page.getByRole("link",{name:"Sign in to save vendor"})).toHaveAttribute("href","/auth/couple?mode=login");await page.getByRole("button",{name:"Compact grid"}).click();await expect(page.locator(".marketplace-grid")).toHaveAttribute("data-density","compact");
});
test("save particles require confirmed change; failures and pending do not celebrate",async({page})=>{
  await page.goto("/?view=actions");await page.getByRole("button",{name:"Toggle pending"}).click();await page.getByRole("button",{name:"Save vendor",exact:true}).click();await expect(page.locator(".save-particles")).toHaveCount(0);await page.getByRole("button",{name:"Resolve request"}).click();await expect(page.getByRole("button",{name:"Remove from Saved Vendors"})).toHaveAttribute("aria-pressed","true");await expect(page.locator(".save-particles i")).toHaveCount(3);await expect(page.locator(".booking-celebration")).toHaveCount(0);
  await page.getByRole("button",{name:"Toggle pending"}).click();await page.getByRole("button",{name:"Remove from Saved Vendors"}).click();await expect(page.locator("[data-save-motion=unsave]")).toBeVisible();await page.getByRole("button",{name:"Toggle failure"}).click();await page.getByRole("button",{name:"Save vendor",exact:true}).click();await expect(page.locator(".save-particles")).toHaveCount(0);
});
test("Marketplace quick save preserves scroll, filters and normal card navigation",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  await page.setViewportSize({width:1440,height:700});
  await page.goto("/?view=quick-save-scroll&category=photography-content&page=2");
  await page.getByRole("button",{name:"Toggle pending"}).click();
  const card=page.locator(".vendor-card").nth(15);
  await card.scrollIntoViewIfNeeded();
  const originalUrl=page.url(), originalScroll=await page.evaluate(()=>scrollY);
  expect(originalScroll).toBeGreaterThan(500);
  const writesText=await page.getByLabel("Fixture controls").textContent();
  const initialWrites=Number(writesText?.match(/writes:\s*(\d+)/)?.[1]);

  const save=card.getByRole("button",{name:"Save vendor",exact:true});
  await save.focus();
  await save.press("Enter");
  await expect(save).toBeDisabled();
  await expect(page.getByLabel("Fixture controls")).toContainText(`writes: ${initialWrites}`);
  await page.getByRole("button",{name:"Resolve request"}).evaluate(button=>(button as HTMLButtonElement).click());
  const remove=card.getByRole("button",{name:"Remove from Saved Vendors",exact:true});
  await expect(remove).toBeEnabled();
  await expect(page.getByLabel("Fixture controls")).toContainText(`writes: ${initialWrites+1}`);
  expect(page.url()).toBe(originalUrl);
  expect(Math.abs((await page.evaluate(()=>scrollY))-originalScroll)).toBeLessThanOrEqual(1);

  await page.getByRole("button",{name:"Toggle pending"}).evaluate(button=>(button as HTMLButtonElement).click());
  await remove.click();
  await expect(card.getByRole("button",{name:"Save vendor",exact:true})).toBeEnabled();
  await expect(page.getByLabel("Fixture controls")).toContainText(`writes: ${initialWrites+2}`);
  expect(page.url()).toBe(originalUrl);
  expect(Math.abs((await page.evaluate(()=>scrollY))-originalScroll)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);

  await card.locator("a").click();
  await expect(page).toHaveURL(/\/vendors\//);
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
