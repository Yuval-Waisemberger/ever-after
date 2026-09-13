import { expect, test } from "@playwright/test";

test("real pending state stays pending until the operation settles, then permits another request", async ({ page }) => {
  const external: string[] = [];
  page.on("request", request => { if (!request.url().startsWith("http://127.0.0.1:3108")) external.push(request.url()); });
  await page.goto("/");
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByLabel("Primary email", { exact: true }).fill("fixture@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("fixture-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("button", { name: "Signing in…", exact: true })).toBeDisabled();
    await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
    const sweep = await page.locator(".couple-auth-submit").evaluate(el => getComputedStyle(el, "::after").animationName);
    expect(sweep).toBe("ea-skeleton-sweep");
    await page.getByRole("button", { name: "Resolve fixture request" }).click();
    await expect(page.getByRole("alert")).toHaveText("Please check your email and password and try again.");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  }
  expect(external).toEqual([]);
});

test("reduced motion preserves pending/error feedback without shimmer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByLabel("Primary email", { exact: true }).fill("fixture@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Signing in…", exact: true })).toBeDisabled();
  expect(await page.locator(".couple-auth-submit").evaluate(el => getComputedStyle(el, "::after").animationName)).toBe("none");
  await page.getByRole("button", { name: "Resolve fixture request" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

test("Forgot Password shows the Spam or Junk notice only after the generic confirmation", async ({ page }) => {
  const confirmation = "If an account exists for this email, we’ve sent a password reset link.";
  const spamNotice = "Important: A password reset email may arrive in your Spam or Junk folder. Check those folders if needed.";
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/?forgot");
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.getByLabel("Email address").fill("fixture@example.invalid");
    await page.getByRole("button", { name: "Send password reset link" }).click();
    await expect(page.getByRole("button", { name: "Requesting reset link…" })).toBeDisabled();
    await page.evaluate(() => window.dispatchEvent(new Event("visual-password-reset-success")));
    await expect(page.getByRole("status")).toHaveText(confirmation);
    const notice = page.getByRole("note");
    await expect(notice).toHaveText(spamNotice);
    expect(Number(await notice.evaluate(element => getComputedStyle(element).fontWeight))).toBeGreaterThanOrEqual(600);
    expect(parseFloat(await notice.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(page.getByRole("button", { name: "Send another reset link" })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("Set New Password prevents duplicate submissions and settles a controlled failure", async ({ page }) => {
  await page.goto("/?reset");
  await expect(page.getByRole("heading", { name: "Set a new password" })).toBeVisible();
  await expect(page.getByText("invalid, expired or has already been used")).toHaveCount(0);
  await page.getByLabel("New password", { exact: true }).fill("fixture-password");
  await page.getByLabel("Confirm new password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByRole("button", { name: "Saving new password…" })).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event("visual-finish")));
  await expect(page.getByRole("alert")).toHaveText("Please check your email and password and try again.");
  await expect(page.getByRole("button", { name: "Set new password" })).toBeEnabled();
  await expect(page).toHaveURL(/\?reset$/);
});


for(const width of [1672,960,390]) test(`Vendor Auth approved control equivalence at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:940},deviceScaleFactor:2});
 const couple=await context.newPage(),vendor=await context.newPage();
 const read=async(page:typeof couple,selector:string,properties:string[])=>page.locator(selector).evaluate((el,keys)=>{const s=getComputedStyle(el);return Object.fromEntries(keys.map(k=>[k,s.getPropertyValue(k)]));},properties);
 for(const mode of ["login","signup"]){
  await couple.goto(`/?couple&mode=${mode}`);await vendor.goto(`/?vendor&mode=${mode}`);
  await vendor.locator('.auth-panel').waitFor();
  const typography=['font-family','font-size','font-weight','line-height','letter-spacing'];
  for(const selector of ['.auth-panel h1','.auth-panel > .eyebrow']) expect(await read(vendor,selector,[...typography,'color','text-transform'])).toEqual(await read(couple,selector,[...typography,'color','text-transform']));
  for(const selector of ['label[for=email]','input[name=email]','label[for=password]','input[name=password]']) expect(await read(vendor,selector,typography)).toEqual(await read(couple,selector,typography));
  expect(await read(vendor,'.auth-panel',['border-radius','padding'])).toEqual({'border-radius':'16px',padding:width===390?'24px 20px':width===960?'24.96px':'40px'});
  const button='.auth-panel button[type=submit]';
  const props=['height','padding','font-family','font-size','font-weight','line-height','letter-spacing','text-transform','background-image','background-color','border-color','border-radius','color','gap','box-shadow','transition'];
  for(const state of ['base','hover','focus','disabled']){
   for(const page of [couple,vendor]){
    if(state==='hover')await page.locator(button).hover();
    if(state==='focus'){await page.mouse.move(0,0);await page.locator(button).focus();}
    if(state==='disabled')await page.locator(button).evaluate(el=>(el as HTMLButtonElement).disabled=true);
   }
   await couple.waitForTimeout(220);
   expect(await read(vendor,button,props)).toEqual(await read(couple,button,props));
  }
  const colors=['background-image','background-color','border-color','box-shadow','opacity','filter','backdrop-filter'];
  expect(await read(vendor,'.auth-panel',colors)).toEqual(await read(couple,'.auth-panel',colors));
  expect(await read(vendor,'input[name=email]',['background-color','border-color','color'])).toEqual(await read(couple,'input[name=email]',['background-color','border-color','color']));
  if(mode==='login')expect(await read(vendor,'a[href*="forgot-password"]',['font-family','font-size','line-height','font-weight','color','letter-spacing'])).toEqual(await read(couple,'a[href*="forgot-password"]',['font-family','font-size','line-height','font-weight','color','letter-spacing']));
  expect(await read(vendor,'.vendor-auth-copy',['animation'])).toEqual(await read(couple,'.auth-copy',['animation']));
  expect(await vendor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await vendor.emulateMedia({reducedMotion:'reduce'});expect(await read(vendor,'.vendor-auth-copy',['animation-name'])).toEqual({'animation-name':'none'});await vendor.emulateMedia({reducedMotion:'no-preference'});
 }
 await context.close();
});
