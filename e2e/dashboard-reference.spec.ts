import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const out = ".codex-tmp/dashboard-correction";
test.beforeEach(async ({page}) => {
 await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});
test("reference composition, real components and responsive states", async ({page}) => {
 test.setTimeout(120000); mkdirSync(out,{recursive:true});
 for(const width of [1672,1280,1024,960,768,390,360]) {
  await page.setViewportSize({width,height:941});
  await page.goto("http://127.0.0.1:3105/?shell&reference");
  await expect(page.locator('.dashboard-reference')).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  for (const card of await page.locator('.dashboard-reveal').all()) {
   await card.scrollIntoViewIfNeeded();
   await expect(card).toHaveAttribute('data-reveal','shown');
  }
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForTimeout(2600);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.countdown-date-label')).toBeHidden();
  await expect(page.getByRole('link',{name:'Edit wedding details'})).toBeVisible();
  const navigation = page.locator(width >= 1024 ? '.workspace-sidebar' : '.workspace-mobile-header');
  await expect(navigation).toHaveCSS('background-color','rgb(251, 248, 245)');
  await expect(navigation).toHaveCSS('background-image','none');
  await expect(navigation).toHaveCSS('opacity','1');
  await expect(navigation).toHaveCSS('backdrop-filter','none');
  await expect(page.locator('.dashboard-budget-ring circle').last()).toHaveAttribute('stroke','url(#dashboard-budget-gradient)');
  const stops=page.locator('#dashboard-budget-gradient stop');
  for (const [index,color] of ['rgb(115, 51, 67)','rgb(183, 121, 131)','rgb(200, 164, 117)'].entries()) await expect(stops.nth(index)).toHaveCSS('stop-color',color);
  await expect(page.locator('.dashboard-tasks-card')).toHaveCSS('background-color','rgb(251, 248, 245)');
  expect(await page.locator('.wedding-overview').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('radial-gradient');
  if(width<1024) {
   await page.getByLabel('Workspace menu',{exact:true}).click();
   await expect(page.locator('.workspace-menu > div')).toHaveCSS('background-color','rgb(251, 248, 245)');
   await expect(page.locator('.workspace-menu > div')).toHaveCSS('background-image','none');
   await page.getByLabel('Workspace menu',{exact:true}).click();
  }
  await page.screenshot({path:`${out}/dashboard-${width}.png`,fullPage:true});
  if(width===1672) {
   const measurements=await page.evaluate(()=>{
    const selectors=['.dashboard-reference','.wedding-dashboard-hero','.dashboard-hero-composition .couple-avatar','.dashboard-tasks-card','.dashboard-upcoming-card','.dashboard-guests-card'];
    return selectors.map(selector=>{const el=document.querySelector(selector)!;const r=el.getBoundingClientRect();const s=getComputedStyle(el);return {selector,x:r.x,y:r.y,width:r.width,height:r.height,font:s.fontFamily,color:s.color,background:s.backgroundColor};});
   });
   writeFileSync(`${out}/measurements.json`,JSON.stringify(measurements,null,2));
   expect(measurements[3].height).toBeLessThan(235);
   expect(measurements[4].height).toBeLessThan(235);
   expect(measurements[5].y).toBeLessThan(900);
  }
 }
});
test("card stagger, budget count-up, hover and rerender retain motion", async ({browser})=>{
 mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out}});
 const page=await context.newPage();
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.addInitScript(() => {
  const state = window as Window & { budgetSamples?: string[] };
  state.budgetSamples = [];
  new MutationObserver(() => {
   const text=document.querySelector('.dashboard-budget-card .planning-value > span')?.textContent;
   if(text && !state.budgetSamples!.includes(text)) state.budgetSamples!.push(text);
  }).observe(document,{subtree:true,childList:true,characterData:true});
 });
 await page.goto('http://127.0.0.1:3105/?shell&reference');
 await expect(page.locator('.dashboard-reference')).toHaveCSS('animation-name','ea-page-enter');
 await expect(page.locator('.dashboard-reference')).toHaveCSS('animation-duration','0.38s');
 const cards=page.locator('.dashboard-reveal');await expect(cards).toHaveCount(6);
 for(let i=0;i<6;i++) {
  await cards.nth(i).scrollIntoViewIfNeeded();
  await expect(cards.nth(i)).toHaveAttribute('data-reveal','shown');
  await expect(cards.nth(i)).toHaveCSS('animation-duration','0.65s');
  await expect(cards.nth(i)).toHaveCSS('animation-delay',`${i/10}s`);
 }
 const amount=page.locator('.dashboard-budget-card .planning-value');
 await expect(amount.locator('span')).toHaveText(await amount.getAttribute('aria-label') ?? '');
 expect(await page.evaluate(() => (window as Window & { budgetSamples?: string[] }).budgetSamples?.length)).toBeGreaterThan(2);
 const original=await amount.innerHTML();
 await page.getByRole('button',{name:'Collapse side navigation'}).click();
 await page.waitForTimeout(150);expect(await amount.innerHTML()).toBe(original);
 await page.getByRole('button',{name:'Expand side navigation'}).click();
 await page.locator('.dashboard-tasks-card').hover();
 await expect(page.locator('.task-summary-grid + div > div')).toHaveCSS('animation-duration','1.1s');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(cards.first()).toHaveCSS('animation-name','none');
 await expect(page.locator('.task-summary-grid + div > div')).toHaveCSS('animation-name','none');
 await page.screenshot({path:`${out}/reduced-motion.png`,fullPage:true});
 await context.close();await page.video()!.saveAs(`${out}/dashboard-motion.webm`);
});
