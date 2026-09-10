import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
const output = ".codex-tmp/cross-site-polish";
const views: [string,number,string][] = [
 ["timeline",3105,"/?shell&timeline&chronology"],
 ["tasks",3104,"/?shell"],["budget",3111,"/budget"],["guests",3111,"/guests"],
 ["reviews",3111,"/reviews"],["settings",3111,"/settings"],["vendor-settings",3111,"/vendor/settings"],
 ["details",3103,"/?shell&view=details"],["setup",3103,"/?shell"],
 ["marketplace",3109,"/?view=directory-page"],["marketplace-guest",3109,"/?view=directory-page&guest"],
 ["vendor-detail",3109,"/?view=profile"],["vendor-detail-guest",3109,"/?view=profile&guest"],["my-vendors",3109,"/?view=my&shell"],
 ["vendor-dashboard",3110,"/vendor"],["vendor-profile",3110,"/vendor/profile"],
 ["vendor-profile-setup",3110,"/vendor/profile?new"],
 ["assistant",3101,"/?shell"],["vendor-signup",3112,"/?vendor&mode=signup"],["vendor-login",3112,"/?vendor&mode=login"],
 ["forgot-password",3112,"/?forgot"],["reset-password",3112,"/?reset"],["verification",3112,"/?verification"],
];
for (const [name,port,path] of views) test(`${name} approved consistency at wide, intermediate and mobile widths`, async ({page}) => {
 test.setTimeout(120000); mkdirSync(output,{recursive:true});
 const errors:string[]=[]; page.on("pageerror",error=>errors.push(error.message));
 await page.route("**/*",route=>new URL(route.request().url()).hostname==="127.0.0.1"?route.continue():route.abort());
 await page.route("**/api/assistant",route=>route.abort());
 for (const width of [1672,960,390]) {
  await page.setViewportSize({width,height:1000});
  await page.goto(`http://127.0.0.1:${port}${path}`);
  await expect(page.locator("main").first()).toBeVisible();
  const root = page.locator('.workspace-shell, .vendor-auth-presentation, .directory-page, .vendor-profile-page, .auth-page:not(.auth-page--couple)').first();
  await expect(root).toHaveCSS('font-family','"Segoe UI", Arial, sans-serif');
  const nav = page.locator(width >= 1024 ? '.workspace-sidebar' : '.workspace-mobile-header');
  if(await nav.count()) await expect(nav).toHaveCSS('background-color','rgb(251, 248, 245)');
  await page.evaluate(async()=>{ await document.fonts.ready; window.scrollTo(0,0); });
  for (const reveal of await page.locator(".planning-reveal, .vendor-reveal").all()) { await reveal.scrollIntoViewIfNeeded(); } await page.waitForTimeout(2200); await page.evaluate(()=>window.scrollTo(0,0));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true});
 }
 expect(errors).toEqual([]);
});
