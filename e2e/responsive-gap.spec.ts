import { test, expect } from "@playwright/test";
const widths = [320,360,390,430,480,540,600,620,621,640,700,701,768,820,900,901,1024,1080,1081,1280,1440];

test("Landing remains readable and collision-free throughout the responsive range", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".hero-content")).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate(()=>window.scrollTo(0,0));
    const layout = await page.evaluate(() => {
      const box=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect().toJSON();
      const hero=document.querySelector(".landing-hero")!;
      return { hero:box(".landing-hero"), title:box("#hero-title"), description:box(".hero-description"), actions:box(".hero-actions"), vendor:box(".hero-vendor"), scroll:box(".hero-scroll"), features:box(".landing-pillars"), heading:box(".landing-pillars h2"),
        wave:parseFloat(getComputedStyle(hero).getPropertyValue("--hero-wave-height")),
        buttons:[...document.querySelectorAll(".hero-actions a")].map(e=>e.getBoundingClientRect().toJSON()),
        pillars:[...document.querySelectorAll(".pillar")].map(e=>({box:e.getBoundingClientRect().toJSON(),usable:e.clientWidth-parseFloat(getComputedStyle(e).paddingLeft)-parseFloat(getComputedStyle(e).paddingRight)})),
        overflow:document.documentElement.scrollWidth>innerWidth };
    });
    expect(layout.overflow,`${width}: horizontal overflow`).toBe(false);
    expect(layout.title.left).toBeGreaterThanOrEqual(0); expect(layout.title.right).toBeLessThanOrEqual(width);
    expect(layout.actions.top,`${width}: copy/actions collision`).toBeGreaterThanOrEqual(layout.description.bottom);
    expect(layout.vendor.top,`${width}: vendor line/actions collision`).toBeGreaterThanOrEqual(layout.actions.bottom);
    expect(layout.scroll.top,`${width}: scroll/action collision`).toBeGreaterThan(layout.vendor.bottom);
    expect(layout.scroll.bottom,`${width}: wave collision`).toBeLessThanOrEqual(layout.hero.bottom-layout.wave);
    expect(layout.heading.top).toBeGreaterThanOrEqual(layout.hero.bottom);
    const [a,b]=layout.buttons;
    expect(a.height).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44);
    expect(a.right<=b.left || a.bottom<=b.top,`${width}: CTA overlap`).toBe(true);
    expect(layout.pillars.every(p=>p.usable>=180),`${width}: cramped feature content`).toBe(true);
    for (const pillar of layout.pillars) expect(pillar.box.top).toBeGreaterThan(layout.heading.bottom);
    await page.screenshot({path:`.codex-tmp/responsive-gap/landing-${width}.png`,fullPage:true});
  }
});

test("Auth and Marketplace shells remain usable at intermediate effective widths",async ({page})=>{
  test.setTimeout(120_000);
  await page.emulateMedia({reducedMotion:"reduce"});
  for(const [name,route] of [["login","/auth/couple?mode=login"],["signup","/auth/couple"],["marketplace","/vendors"]]) {
    await page.goto(route); await expect(page.locator("h1")).toBeVisible();
    for(const width of [480,600,640,700,820]) {
      await page.setViewportSize({width,height:950});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} ${width}`).toBe(true);
      for(const control of await page.locator('main input:not([type=hidden],[type=checkbox]),main button[type=submit]').all()) {
        if(await control.isVisible()) expect((await control.boundingBox())!.width).toBeGreaterThan(100);
      }
      await page.screenshot({path:`.codex-tmp/responsive-gap/${name}-${width}.png`,fullPage:true});
    }
  }
});
