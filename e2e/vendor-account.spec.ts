import { designSweep } from "./helpers/design-sweep";
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const artifacts = ".codex-tmp/phase2d-review";
test.beforeEach(async ({page}) => { await page.route("**/*",route=>new URL(route.request().url()).hostname==="127.0.0.1"?route.continue():route.abort()); });
for (const width of [1440,768,390,360]) {
  test(`Vendor presentation at ${width}px`,async ({page})=>{
    await mkdir(artifacts,{recursive:true}); await page.setViewportSize({width,height:1000});
    await page.goto("/vendor"); await expect(page.getByRole("heading",{name:"Willow Studio"})).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow","50");
    await expect(page.getByRole("img",{name:"4.4 out of 5 stars"})).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator("[data-just-completed=true]")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator("#recent-reviews").scrollIntoViewIfNeeded(); await page.waitForTimeout(1400);
    await page.screenshot({path:`${artifacts}/dashboard-${width}.png`,fullPage:true});
    await page.getByRole("link",{name:"Edit profile",exact:true}).click();
    await expect(page.getByRole("heading",{name:"My Business Profile",exact:true})).toBeVisible();
    await expect(page.getByLabel("FRIDAY AFTERNOON",{exact:true})).toBeChecked();
    await expect(page.getByLabel("CENTRAL ISRAEL",{exact:true})).toBeChecked();
    for (const section of await page.locator("main section").all()) { await section.scrollIntoViewIfNeeded(); await page.waitForTimeout(750); }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`${artifacts}/profile-${width}.png`,fullPage:true});
  });
}
test("checklist navigates/focuses; only saved completion changes animate",async ({page})=>{
  await page.goto("/vendor");
  await page.getByRole("link",{name:"Write a description — add details"}).click();
  await expect(page.getByLabel("Description",{exact:true})).toBeFocused();
  await page.getByLabel("Description",{exact:true}).fill("A thoughtful photographic perspective.");
  await page.getByRole("button",{name:"Save business profile",exact:true}).click();
  await expect(page.getByText("Business profile saved",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Saved ✓",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Dashboard",exact:true}).first().click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow","63");
  await expect(page.locator('[data-step="Write a description"]')).toHaveAttribute("data-just-completed","true");
  await page.screenshot({path:`${artifacts}/checklist-saved.png`,fullPage:true});
});
test("pending and failed publication never claim live; saved publication does",async ({page})=>{
  await page.goto("/vendor/profile");
  await page.getByRole("switch",{name:/Publish my Vendor Profile/}).check();
  await page.getByRole("button",{name:"Toggle pending",exact:true}).click();
  await page.getByRole("button",{name:"Toggle failure",exact:true}).click();
  await page.getByRole("button",{name:"Save business profile",exact:true}).click();
  await expect(page.getByRole("button",{name:"Saving…",exact:true})).toBeDisabled();
  await expect(page.getByText("Your profile is live",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Resolve request",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await expect(page.getByText("Your profile is live",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Toggle failure",exact:true}).click();
  await page.getByRole("switch",{name:/Publish my Vendor Profile/}).check();
  await page.getByRole("button",{name:"Save business profile",exact:true}).click();
  await page.getByRole("button",{name:"Resolve request",exact:true}).click();
  await expect(page.getByText("Your profile is live",{exact:true})).toBeVisible();
  await expect(page.getByText("Couples can now find and contact you")).toBeVisible();
  await page.screenshot({path:`${artifacts}/published-success.png`,fullPage:true});
  await page.getByRole("link",{name:"Dashboard",exact:true}).first().click();
  await expect(page.getByText("Public · Live",{exact:true})).toBeVisible();
  await expect(page.locator(".vendor-publish-success")).toHaveCount(0);
});
test("empty ratings, accurate fractional stars, finite reveals and reduced motion",async ({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"}); await page.goto("/vendor?empty=1");
  await expect(page.getByText("Your first review will appear here.")).toBeVisible();
  await expect(page.locator(".vendor-stars")).toHaveCount(0);
  await page.screenshot({path:`${artifacts}/no-reviews-private.png`,fullPage:true});
  await page.goto("/vendor"); await expect(page.locator('[aria-label="4.4"]')).toHaveText("4.4");
  const fills=await page.locator(".vendor-rating .vendor-star-fill").evaluateAll(elements=>elements.map(e=>(e as HTMLElement).style.width));
  expect(fills).toEqual(["100%","100%","100%","100%","37.5%"]);
  expect(await page.locator(".vendor-rating .vendor-star").first().evaluate(e=>getComputedStyle(e).animationName)).toBe("none");
  await page.getByRole("button",{name:"Rerender",exact:true}).click();
  await expect(page.locator('[aria-label="4.4"]')).toHaveText("4.4");
});

test("record finite Vendor motion and real save/publication feedback",async ({browser})=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:`${artifacts}/recordings`,size:{width:1440,height:1000}}});
  const page=await context.newPage();
  await page.route("**/*",route=>new URL(route.request().url()).hostname==="127.0.0.1"?route.continue():route.abort());
  await page.goto("http://127.0.0.1:3110/vendor");
  await expect(page.getByRole("progressbar")).toBeVisible(); await page.waitForTimeout(2200);
  await page.locator("#recent-reviews").scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
  await page.getByRole("link",{name:"Write a description — add details"}).click();
  await page.getByLabel("Description",{exact:true}).fill("Considered photography for the moments that matter.");
  await expect(page.getByLabel("Description",{exact:true})).toBeFocused();
  await page.waitForTimeout(300);
  expect(await page.getByLabel("Description",{exact:true}).evaluate(e=>getComputedStyle(e).backgroundSize)).toBe("100% 2px");
  await page.getByRole("button",{name:"Save business profile",exact:true}).click();
  await expect(page.getByText("Business profile saved",{exact:true})).toBeVisible(); await page.waitForTimeout(1000);
  await page.getByRole("link",{name:"Dashboard",exact:true}).first().click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow","63"); await page.waitForTimeout(1800);
  await page.getByRole("link",{name:"Manage visibility"}).click();
  await page.getByRole("switch",{name:/Publish my Vendor Profile/}).check();
  await page.getByRole("button",{name:"Toggle pending",exact:true}).click();
  await page.getByRole("button",{name:"Save business profile",exact:true}).click();
  await expect(page.getByRole("button",{name:"Saving…",exact:true})).toBeVisible(); await page.waitForTimeout(1000);
  await page.getByRole("button",{name:"Resolve request",exact:true}).click();
  await expect(page.getByText("Your profile is live",{exact:true})).toBeVisible(); await page.waitForTimeout(1500);
  await page.getByLabel("Business name",{exact:true}).fill("Willow Studio Updated");
  await expect(page.getByRole("button",{name:"Save business profile",exact:true})).toBeVisible();
  await context.close();
  await page.video()!.saveAs(`${artifacts}/vendor-motion.webm`);
});


test("final design intermediate-width sweep", async ({ page }) => {
  test.setTimeout(240000);
  await designSweep(page, { "vendor-dashboard": "/vendor", "business-profile": "/vendor/profile" });
});
