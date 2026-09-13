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
  await page.locator(".business-profile-savebar").getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(page.getByText("Business profile saved",{exact:true})).toBeVisible();
  await expect(page.locator(".business-profile-savebar").getByRole("button",{name:"Saved ✓",exact:true})).toBeVisible();
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
  await page.locator(".business-profile-savebar").getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(page.locator(".business-profile-savebar").getByRole("button",{name:"Saving…",exact:true})).toBeDisabled();
  await expect(page.getByText("Your profile is live",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Resolve request",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await expect(page.getByText("Your profile is live",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Toggle failure",exact:true}).click();
  await page.getByRole("switch",{name:/Publish my Vendor Profile/}).check();
  await page.locator(".business-profile-savebar").getByRole("button",{name:"Save changes",exact:true}).click();
  await page.getByRole("button",{name:"Resolve request",exact:true}).click();
  await expect(page.getByText("Your profile is live",{exact:true})).toBeVisible();
  await expect(page.getByText("Couples can now find and contact you")).toBeVisible();
  await page.screenshot({path:`${artifacts}/published-success.png`,fullPage:true});
  await page.getByRole("link",{name:"Dashboard",exact:true}).first().click();
  await expect(page.locator(".vendor-publication-summary").getByText("Public · Live",{exact:true})).toBeVisible();
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
  await page.locator(".business-profile-savebar").getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(page.getByText("Business profile saved",{exact:true})).toBeVisible(); await page.waitForTimeout(1000);
  await page.getByRole("link",{name:"Dashboard",exact:true}).first().click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow","63"); await page.waitForTimeout(1800);
  await page.getByRole("link",{name:"Manage visibility"}).click();
  await page.getByRole("switch",{name:/Publish my Vendor Profile/}).check();
  await page.getByRole("button",{name:"Toggle pending",exact:true}).click();
  await page.locator(".business-profile-savebar").getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(page.locator(".business-profile-savebar").getByRole("button",{name:"Saving…",exact:true})).toBeVisible(); await page.waitForTimeout(1000);
  await page.getByRole("button",{name:"Resolve request",exact:true}).click();
  await expect(page.getByText("Your profile is live",{exact:true})).toBeVisible(); await page.waitForTimeout(1500);
  await page.getByLabel("Business name",{exact:true}).fill("Willow Studio Updated");
  await expect(page.locator(".business-profile-savebar").getByRole("button",{name:"Save changes",exact:true})).toBeVisible();
  await context.close();
  await page.video()!.saveAs(`${artifacts}/vendor-motion.webm`);
});


test("final design intermediate-width sweep", async ({ page }) => {
  test.setTimeout(240000);
  await designSweep(page, { "vendor-dashboard": "/vendor", "business-profile": "/vendor/profile" });
});


test("identity selection validates and previews without writing gallery records", async ({page}) => {
  await page.goto("/vendor/profile");
  const input = page.getByLabel("Choose profile image",{exact:true});
  await input.setInputFiles({name:"bad.txt",mimeType:"text/plain",buffer:Buffer.from("invalid")});
  await expect(page.getByText("Use a JPG, PNG, or WebP image.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Upload profile image",exact:true})).toBeDisabled();
  await input.setInputFiles({name:"profile.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ5kAAAAASUVORK5CYII=","base64")});
  await expect(page.getByRole("img",{name:"Selected profile image preview"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Upload profile image",exact:true})).toBeEnabled();
  await expect(page.getByText("Isolated fixture · writes: 0",{exact:true})).toBeVisible();
});

test("Save changes persists a selected profile picture and sparse details through reload and reopening", async ({page}) => {
  await page.goto("/vendor/profile?sparse=1");
  await page.getByLabel("Description", { exact: true }).fill("A sparse profile with a stored identity image.");
  await page.getByLabel("Choose profile image", { exact: true }).setInputFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ5kAAAAASUVORK5CYII=", "base64"),
  });
  await expect(page.getByRole("img", { name: "Selected profile image preview" })).toBeVisible();

  await page.getByRole("button", { name: "Toggle pending", exact: true }).click();
  await page.locator(".business-profile-savebar").getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".business-profile-savebar").getByRole("button", { name: "Saving…", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Upload profile image", exact: true })).toBeDisabled();
  const pending = await page.evaluate(async () => {
    const data = await import(/* @vite-ignore */ String("/data.ts"));
    return { profileWrites: data.fixture.profileWrites, uploads: data.fixture.uploads, imageWrites: data.fixture.imageWrites };
  });
  expect(pending).toEqual({ profileWrites: 1, uploads: 0, imageWrites: 0 });
  await page.getByRole("button", { name: "Resolve request", exact: true }).click();
  await expect(page.getByText("Business profile saved", { exact: true })).toBeVisible();
  const persisted = await page.evaluate(async () => {
    const data = await import(/* @vite-ignore */ String("/data.ts"));
    return { fixture: data.fixture, profile: await data.getOwnedVendorProfile() };
  });
  expect(persisted.fixture.profileWrites).toBe(1);
  expect(persisted.fixture.uploads).toBe(1);
  expect(persisted.fixture.imageWrites).toBe(1);
  expect(persisted.fixture.lastUpload.bucket).toBe("vendor-media");
  expect(persisted.fixture.lastUpload.path).toMatch(/^isolated-vendor\/profile\/.+\.png$/);
  expect(persisted.profile.description).toBe("A sparse profile with a stored identity image.");
  expect(persisted.profile.profile_image_storage_path).toBe(persisted.fixture.lastUpload.path);
  await expect(page.getByRole("img", { name: "Willow Studio profile image" })).toBeVisible();

  await page.reload();
  await expect(page.locator("#description")).toHaveValue("A sparse profile with a stored identity image.");
  await expect(page.getByRole("img", { name: "Willow Studio profile image" })).toBeVisible();
  await page.getByRole("link", { name: "Dashboard", exact: true }).first().click();
  await page.getByRole("link", { name: "Edit profile", exact: true }).click();
  await expect(page.locator("#description")).toHaveValue("A sparse profile with a stored identity image.");
  await expect(page.getByRole("img", { name: "Willow Studio profile image" })).toBeVisible();
});

test("a profile-picture failure settles without overall false success or replacing the stored picture", async ({page}) => {
  await page.goto("/vendor/profile");
  await page.getByRole("button", { name: "Toggle image failure", exact: true }).click();
  await page.getByLabel("Choose profile image", { exact: true }).setInputFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ5kAAAAASUVORK5CYII=", "base64"),
  });
  await page.locator(".business-profile-savebar").getByRole("button", { name: "Save changes", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("Profile image could not be saved");
  await expect(page.getByText("Business profile saved", { exact: true })).toHaveCount(0);
  await expect(page.locator(".business-profile-savebar").getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
  const result = await page.evaluate(async () => {
    const data = await import(/* @vite-ignore */ String("/data.ts"));
    return { profile: await data.getOwnedVendorProfile(), uploads: data.fixture.uploads, imageWrites: data.fixture.imageWrites };
  });
  expect(result.uploads).toBe(1);
  expect(result.imageWrites).toBe(1);
  expect(result.profile.profile_image_storage_path).toBeNull();
});

test("an invalid selected profile picture blocks the combined save before any write", async ({page}) => {
  await page.goto("/vendor/profile");
  await page.getByLabel("Description", { exact: true }).fill("This draft must not be written.");
  await page.getByLabel("Choose profile image", { exact: true }).setInputFiles({
    name: "profile.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await page.locator(".business-profile-savebar").getByRole("button", { name: "Save changes", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("Use a JPG, PNG, or WebP image.");
  const result = await page.evaluate(async () => {
    const data = await import(/* @vite-ignore */ String("/data.ts"));
    return { profileWrites: data.fixture.profileWrites, uploads: data.fixture.uploads, imageWrites: data.fixture.imageWrites };
  });
  expect(result).toEqual({ profileWrites: 0, uploads: 0, imageWrites: 0 });
});


test("Business Profile external save controls share all fields and submit once", async ({page}) => {
  await page.goto("/vendor/profile");
  await page.getByLabel("Business name",{exact:true}).fill("Updated fixture studio");
  await page.getByLabel("Contact person",{exact:true}).fill("Contact fixture");
  const fields = await page.locator("#vendor-business-profile-form").evaluate(form => [...new FormData(form as HTMLFormElement).entries()].map(([key,value])=>[key, String(value)]));
  expect(fields).toContainEqual(["businessName","Updated fixture studio"]);
  expect(fields).toContainEqual(["contactName","Contact fixture"]);
  expect(fields).toContainEqual(["serviceAreas","central_israel"]);
  expect(fields).toContainEqual(["eventTypes","friday_afternoon"]);
  expect(fields.map(([key])=>key)).not.toContain("image");
  expect(fields.map(([key])=>key)).not.toContain("imageId");
  expect(await page.locator("form form").count()).toBe(0);
  await page.getByRole("button",{name:"Toggle pending",exact:true}).click();
  await page.locator(".ea-page-header").getByRole("button",{name:"Save changes",exact:true}).click();
  await expect.poll(() => page.evaluate(async () => (await import(/* @vite-ignore */ String("/data.ts"))).fixture.writes)).toBe(1);
  await expect(page.getByRole("button",{name:"Saving…",exact:true})).toHaveCount(2);
  for (const button of await page.getByRole("button",{name:"Saving…",exact:true}).all()) await expect(button).toBeDisabled();
  await page.getByRole("button",{name:"Resolve request",exact:true}).click();
  await expect(page.locator(".business-profile-savebar").getByRole("button",{name:"Saved ✓",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Toggle pending",exact:true}).click();
  await page.getByLabel("Business name",{exact:true}).fill("Second fixture name");
  await page.locator(".business-profile-savebar").getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(page.getByText("Isolated fixture · writes: 2",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Business name",{exact:true})).toHaveValue("Second fixture name");
  await page.getByRole("link",{name:/Add photo/}).first().click();
  await expect(page.locator("#gallery-upload input[type=file]")).toBeFocused();
});

test("Business Profile persists representative field shapes through a full reload", async ({page}) => {
  await page.goto("/vendor/profile");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue("Willow Studio");

  await page.getByLabel("Business name", { exact: true }).fill("Persisted Willow Studio");
  await page.locator('select[name="categoryChoice"]').selectOption({ label: "WEDDING VIDEOGRAPHERS" });
  await page.getByLabel("Minimum price (₪)", { exact: true }).fill("7200");
  await page.getByLabel("Maximum guest capacity", { exact: true }).fill("420");
  await page.getByLabel("ELEGANT", { exact: true }).uncheck();
  await page.getByLabel("MODERN", { exact: true }).check();
  await page.getByLabel("FRIDAY AFTERNOON", { exact: true }).uncheck();
  await page.getByLabel("EVENING", { exact: true }).check();
  await page.locator(".business-profile-savebar").getByRole("button", { name: "Save changes", exact: true }).click();

  await expect(page.getByText("Business profile saved", { exact: true })).toBeVisible();
  await expect(page.getByText("Isolated fixture · writes: 1", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue("Persisted Willow Studio");
  await expect(page.getByLabel("MODERN", { exact: true })).toBeChecked();

  await page.reload();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue("Persisted Willow Studio");
  await expect(page.locator('select[name="categoryChoice"]')).toHaveValue("photo:video");
  await expect(page.getByLabel("Minimum price (₪)", { exact: true })).toHaveValue("7200");
  await expect(page.getByLabel("Maximum guest capacity", { exact: true })).toHaveValue("420");
  await expect(page.getByLabel("MODERN", { exact: true })).toBeChecked();
  await expect(page.getByLabel("ELEGANT", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("EVENING", { exact: true })).toBeChecked();
  await expect(page.getByLabel("FRIDAY AFTERNOON", { exact: true })).not.toBeChecked();
});

test("a sparse existing Business Profile saves one optional field once and reloads from fresh data", async ({page}) => {
  await page.goto("/vendor/profile?sparse=1");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue("Willow Studio");
  await expect(page.getByLabel("Contact person", { exact: true })).toHaveValue("");
  await expect(page.locator('select[name="categoryChoice"]')).toHaveValue("");
  await expect(page.getByLabel("Minimum price (₪)", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("ELEGANT", { exact: true })).not.toBeChecked();

  await page.getByLabel("Business name", { exact: true }).fill("");
  await page.getByLabel("Description", { exact: true }).fill("The only newly completed profile detail.");
  await page.locator(".business-profile-savebar").getByRole("button", { name: "Save changes", exact: true }).click();

  await expect(page.getByText("Business profile saved", { exact: true })).toBeVisible();
  await expect(page.getByText("Isolated fixture · writes: 1", { exact: true })).toBeVisible();
  const submission = await page.evaluate(async () => (await import(/* @vite-ignore */ String("/data.ts"))).fixture.lastSubmission);
  expect(submission).toContainEqual(["description", "The only newly completed profile detail."]);
  expect(submission).toContainEqual(["businessName", ""]);

  await page.reload();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue("Willow Studio");
  await expect(page.locator("#description")).toHaveValue("The only newly completed profile detail.");
  await page.getByRole("link", { name: "Dashboard", exact: true }).first().click();
  await page.getByRole("link", { name: "Edit profile", exact: true }).click();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue("Willow Studio");
  await expect(page.locator("#description")).toHaveValue("The only newly completed profile detail.");
});

test("Gallery removal settles once, updates the current page, and survives reload", async ({page}) => {
  await page.goto("/vendor/profile");
  await expect(page.getByRole("img", { name: "Editorial hands and rings" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle pending", exact: true }).click();
  await page.getByRole("button", { name: "Delete image", exact: true }).click();

  await expect(page.getByRole("button", { name: "Removing image", exact: true })).toBeDisabled();
  await expect.poll(() => page.evaluate(async () => (await import(/* @vite-ignore */ String("/data.ts"))).fixture.writes)).toBe(1);
  await page.getByRole("button", { name: "Resolve request", exact: true }).click();
  await expect(page.getByRole("img", { name: "Editorial hands and rings" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Add photo/ })).toHaveCount(3);

  await page.reload();
  await expect(page.getByRole("img", { name: "Editorial hands and rings" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Add photo/ })).toHaveCount(3);
});

test("Gallery removal failure clears pending state without false success", async ({page}) => {
  await page.goto("/vendor/profile");
  await page.getByRole("button", { name: "Toggle failure", exact: true }).click();
  await page.getByRole("button", { name: "Delete image", exact: true }).click();

  await expect(page.getByRole("alert")).toHaveText("The image could not be removed.");
  await expect(page.getByRole("button", { name: "Delete image", exact: true })).toBeEnabled();
  await expect(page.getByRole("img", { name: "Editorial hands and rings" })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => (await import(/* @vite-ignore */ String("/data.ts"))).fixture.writes)).toBe(1);
});

test("Business Profile labels stay inside their frames at target widths", async ({page}) => {
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/vendor/profile");

    for (const label of ["Service areas", "Styles", "Suitable event types"]) {
      const contained = await page.getByText(label, { exact: true }).evaluate(legend => {
        const fieldset = legend.closest("fieldset");
        if (!fieldset) return false;
        const outer = fieldset.getBoundingClientRect();
        const inner = legend.getBoundingClientRect();
        return inner.top >= outer.top + 8 && inner.left >= outer.left + 8 && inner.right <= outer.right - 8;
      });
      expect(contained, `${label} at ${width}px`).toBe(true);
    }

    for (const name of ["Minimum guest capacity", "Maximum guest capacity"]) {
      const aligned = await page.getByLabel(name, { exact: true }).evaluate(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        const panel = input.closest("section");
        if (!label || !panel) return false;
        const control = input.getBoundingClientRect();
        const frame = panel.getBoundingClientRect();
        return control.top > label.getBoundingClientRect().top && control.left >= frame.left && control.right <= frame.right;
      });
      expect(aligned, `${name} at ${width}px`).toBe(true);
    }
    await expect(page.getByText("Your changes are saved only when you choose Save changes. Image uploads are saved separately.", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});


test("Business Profile option states and identity padding remain accessible", async ({page}) => {
  await page.goto("/vendor/profile");
  const options=page.locator(".vendor-choice input,.business-profile-option input");
  for(const input of await options.all()) {
    await input.check();
    await expect(input).toBeChecked();
    await expect(input.locator("..")).toHaveCSS("border-top-color","rgb(115, 51, 67)");
    await input.focus();
    await page.keyboard.press("Space");
    await expect(input).not.toBeChecked();
    await expect(input).toBeFocused();
  }
  const panel=page.locator("#profile-image");
  await expect(panel.getByLabel("No profile image")).toBeVisible();
  await expect(panel.getByRole("button",{name:"Upload profile image",exact:true})).toBeDisabled();
  for(const width of [1672,960,390]) {
    await page.setViewportSize({width,height:940});
    await panel.locator('input[type=file]').setInputFiles({name:"very-long-invalid-file-name-".repeat(12)+".txt",mimeType:"text/plain",buffer:Buffer.from("invalid")});
    await expect(panel.getByRole("status")).toBeVisible();
    expect(await panel.evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll("input,button,p,img")].every(c=>{const b=c.getBoundingClientRect();return b.left>=r.left+12&&b.right<=r.right-12&&b.bottom<=r.bottom-12;});})).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
