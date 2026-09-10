import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
const output = ".codex-tmp/approved-consistency";
test.beforeEach(async ({page}) => {
  await page.route("**/*",r=>new URL(r.request().url()).hostname==="127.0.0.1"?r.continue():r.abort());
  await page.emulateMedia({reducedMotion:"reduce"});
});
test("protected routes retain exact pixels after eligible styles and client navigation", async ({page})=>{
  test.setTimeout(120000);
  for(const width of [1672,390]) {
    await page.setViewportSize({width,height:941});
    for(const [name,query] of [["couple-login","?couple&mode=login"],["couple-signup","?couple&mode=signup"],["landing","?landing"]]) {
      await page.goto("http://127.0.0.1:3112/?vendor&mode=login");
      await expect(page.locator('.vendor-auth-presentation')).toBeVisible();
      await page.evaluate(q=>window.dispatchEvent(new CustomEvent("visual-navigate",{detail:q})),query);
      await expect(page.locator(name==="landing"?'.landing-page':'.auth-page--couple')).toBeVisible();
      await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
      const result=await page.screenshot({path:`${output}/navigation-${name}-${width}.png`,fullPage:true});
      expect(result.equals(readFileSync(`${output}/before-${name}-${width}.png`))).toBe(true);
    }
    await page.goto("http://127.0.0.1:3105/?shell&timeline");
    await expect(page.locator('.ea-consistent-page')).toBeVisible();
    await page.goto("http://127.0.0.1:3105/?shell&reference");
    // Keep the eligible stylesheet present, as it is after a Next client transition.
    await page.addStyleTag({content:readFileSync("src/app/eligible-consistency.css","utf8")});
    await expect(page.locator('.dashboard-reference')).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
    expect((await page.screenshot({path:`${output}/navigation-dashboard-${width}.png`,fullPage:true})).equals(readFileSync(`${output}/before-dashboard-${width}.png`))).toBe(true);
  }
});
test("Vendor auth preserves fields, password visibility, pending and safe errors",async({page})=>{
  for(const mode of ["login","signup"]) {
    await page.goto(`http://127.0.0.1:3112/?vendor&mode=${mode}`);
    const form=page.locator('.auth-panel form');
    await expect(form.locator('input:not([type=hidden])')).toHaveCount(mode==="login"?2:6);
    if(mode==="signup") {
      await page.getByLabel('Business name',{exact:true}).fill('Fixture Studio');
      await page.getByLabel('Contact person',{exact:true}).fill('Fixture Person');
      await page.getByLabel('Confirm password',{exact:true}).fill('fixture-password');
    }
    await page.getByLabel('Primary email',{exact:true}).fill('fixture@example.test');
    await page.getByLabel('Password',{exact:true}).fill('fixture-password');
    await page.getByRole('button',{name:'Show password',exact:true}).click();
    await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
    await page.getByRole('button',{name:mode==="login"?'Sign in':'Create account',exact:true}).click();
    await expect(form.locator('button[type=submit]')).toBeDisabled();
    await page.evaluate(()=>window.dispatchEvent(new Event('visual-finish')));
    await expect(page.getByText('Please check your email and password and try again.')).toBeVisible();
    await expect(form.locator('button[type=submit]')).toBeEnabled();
  }
});
test("eligible Couple, Vendor and public menus retain ivory surfaces and keyboard access",async({page})=>{
  for(const [name,url,selector] of [
    ["couple","http://127.0.0.1:3104/?shell",".workspace-menu"],
    ["vendor","http://127.0.0.1:3110/vendor",".workspace-menu"],
    ["public","http://127.0.0.1:3109/",".public-mobile-menu"],
    ["vendor-auth","http://127.0.0.1:3112/?vendor&mode=signup",".public-mobile-menu"],
  ]) for(const width of [960,390]) {
    await page.setViewportSize({width,height:941});
    await page.goto(url);
    const menu=page.locator(selector), toggle=menu.locator('summary').first();
    await expect(menu).toBeAttached();
    if(!(await toggle.isVisible())) { await expect(page.locator('.public-desktop-nav')).toBeVisible(); continue; }
    await toggle.focus(); await expect(toggle).toBeFocused(); await toggle.press('Enter');
    await expect(menu).toHaveAttribute('open','');
    const surface=menu.locator(selector==='.workspace-menu'?':scope > div':':scope > nav');
    await expect(surface).toHaveCSS('background-color','rgb(251, 248, 245)');
    await expect(surface).toHaveCSS('background-image','none');
    await expect(surface.locator('nav a, :scope > a').first()).toHaveCSS('font-family','"Segoe UI", Arial, sans-serif');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`${output}/menu-${name}-${width}.png`,fullPage:true});
  }
});
