import { expect, test, type Locator } from "@playwright/test";
import vendors from "../src/generated/marketplace-demo.json";

const representativeSubcategories = [
  "wedding-venues",
  "wedding-photographers",
  "videographers",
  "social-content",
  "djs",
  "wedding-dresses",
  "suits",
  "makeup-hair",
  "event-design",
  "flowers",
  "invitations",
  "transportation",
  "officiants",
  "event-managers",
  "preparation-hotels",
  "wedding-cakes",
  "dessert-tables",
  "pastry-patisserie",
  "custom-sweets",
  "dance-floor-accessories",
  "glow-accessories",
  "guest-comfort-accessories",
  "party-props-giveaways",
] as const;

async function expectImageDecoded(image: Locator) {
  // Exercise the real lazy-loading path instead of rewriting src/srcset in the test.
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect.poll(
    () => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0).catch(() => false),
    { timeout: 15_000 },
  ).toBe(true);
}

test("landing page exposes the three entry paths", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EVER AFTER", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan our wedding", exact: true })).toHaveAttribute("href", "/auth/couple");
  await expect(page.locator(".hero-vendor a")).toHaveAttribute("href", "/auth/vendor");
  await expect(page.getByRole("link", { name: "Explore vendors", exact: true })).toHaveAttribute("href", "/vendors");
});

test("guest can browse the seeded marketplace preview and a vendor profile", async ({ page }) => {
  await page.goto("/vendors?category=photography-content");
  await expect(page.getByRole("heading", { name: "Find the people behind your perfect day." })).toBeVisible();
  await expect(page.getByText("88 vendors", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(12);
  await expect(page.getByText("Page 1 of 8", { exact: true })).toBeVisible();

  const firstCard = page.locator("article.vendor-card").first();
  const businessName = (await firstCard.getByRole("heading").innerText()).trim();
  await firstCard.locator('a[href^="/vendors/"]').click();
  await expect(page.getByRole("heading", { name: businessName, exact: true, level: 1 })).toBeVisible();
  const cover = page.locator("main img").first();
  await expectImageDecoded(cover);
});

test("representative marketplace covers decode across the requested categories", async ({ page }) => {
  test.setTimeout(90_000);
  for (const subcategory of representativeSubcategories) {
    const vendor = vendors.find((entry) => entry.subcategorySlug === subcategory && entry.imageUrl);
    expect(vendor, subcategory).toBeTruthy();
    await page.goto(`/vendors?subcategory=${subcategory}&search=${encodeURIComponent(vendor!.businessName)}`);
    await expect(page.locator("article.vendor-card")).toHaveCount(1);
    await expectImageDecoded(page.getByRole("img", { name: vendor!.imageAlt, exact: true }));
  }
});

test("approved new-vendor covers render on cards and profiles at desktop and mobile widths", async ({ page }) => {
  test.setTimeout(180_000);
  const samples = [
    vendors.find((vendor) => vendor.slug === "moon-cakes-workshop-01")!,
    vendors.find((vendor) => vendor.slug === "south-desserts-house-01")!,
    vendors.find((vendor) => vendor.slug === "amber-patisserie-works-01")!,
    vendors.find((vendor) => vendor.slug === "indigo-confections-studio-05")!,
    vendors.find((vendor) => vendor.slug === "cedar-party-goods-collective-07")!,
    vendors.find((vendor) => vendor.slug === "luna-glow-atelier-03")!,
    vendors.find((vendor) => vendor.slug === "pomegranate-guest-comfort-works-05")!,
    vendors.find((vendor) => vendor.slug === "moon-extras-collective-06")!,
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const vendor of samples) {
      await page.goto(`/vendors?search=${encodeURIComponent(vendor.businessName)}`);
      const card = page.locator("article.vendor-card");
      await expect(card).toHaveCount(1);
      await expectImageDecoded(card.getByRole("img", { name: vendor.imageAlt, exact: true }));
      await card.locator('a[href^="/vendors/"]').click();
      await expect(page.getByRole("heading", { name: vendor.businessName, exact: true, level: 1 })).toBeVisible();
      await expectImageDecoded(page.locator("main img").first());
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("all pooled and approved marketplace images decode successfully", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const imageUrls = [...new Set(vendors.flatMap((vendor) => vendor.imageUrl ? [vendor.imageUrl] : []))];
  expect(imageUrls).toHaveLength(291);

  for (let index = 0; index < imageUrls.length; index += 48) {
    const failures = await page.evaluate(async (urls) => {
      const results = await Promise.all(
        urls.map(
          (url) =>
            new Promise<string | null>((resolve) => {
              const image = new Image();
              image.onload = () => resolve(image.complete && image.naturalWidth > 0 ? null : url);
              image.onerror = () => resolve(url);
              image.src = url;
            }),
        ),
      );
      return results.filter((url): url is string => url !== null);
    }, imageUrls.slice(index, index + 48));
    expect(failures).toEqual([]);
  }
});

test("all 64 new vendor cards and profiles use their deterministic approved primary", async ({ page }) => {
  test.setTimeout(600_000);
  const newSubcategories = [
    "wedding-cakes", "dessert-tables", "pastry-patisserie", "custom-sweets",
    "dance-floor-accessories", "glow-accessories", "guest-comfort-accessories", "party-props-giveaways",
  ];
  const newVendors = vendors.filter((vendor) => vendor.subcategorySlug && newSubcategories.includes(vendor.subcategorySlug));
  expect(newVendors).toHaveLength(64);

  for (const subcategory of newSubcategories) {
    await page.goto(`/vendors?subcategory=${subcategory}`);
    const cards = page.locator("article.vendor-card");
    await expect(cards).toHaveCount(8);
    await expect(cards.locator("img")).toHaveCount(8);
    for (const vendor of newVendors.filter((entry) => entry.subcategorySlug === subcategory)) {
      const card = cards.filter({ has: page.getByRole("heading", { name: vendor.businessName, exact: true }) });
      await expect(card).toHaveCount(1);
      const cardImage = card.getByRole("img", { name: vendor.imageAlt, exact: true });
      await expectImageDecoded(cardImage);
      expect(decodeURIComponent((await cardImage.getAttribute("src")) ?? "")).toContain(vendor.imageUrl!);
    }
  }

  for (const vendor of newVendors) {
    await page.goto(`/vendors/${vendor.slug}`);
    await expect(page.getByRole("heading", { name: vendor.businessName, exact: true })).toBeVisible();
    const profileImage = page.getByRole("img", { name: vendor.imageAlt, exact: true }).first();
    await expectImageDecoded(profileImage);
    expect(decodeURIComponent((await profileImage.getAttribute("src")) ?? "")).toContain(vendor.imageUrl!);
  }
});

test("targeted cover sequences match the approved mappings on mobile and desktop listing pages", async ({ page }) => {
  test.setTimeout(300_000); // Scroll each real lazy image into view across 36 result pages.
  const categories = ["social-content", "djs", "photo-booths", "wedding-dresses", "makeup-hair", "event-design", "flowers", "invitations", "preparation-hotels"];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const subcategory of categories) {
      for (const pageNumber of [1, 2]) {
        await page.goto(`/vendors?subcategory=${subcategory}&page=${pageNumber}`);
        const cards = page.locator(".vendor-card");
        await expect(cards).toHaveCount(pageNumber === 1 ? 12 : 10);
        const sources = await cards.locator("img").evaluateAll(images => images.map(image => new URL((image as HTMLImageElement).src).searchParams.get("url") ?? (image as HTMLImageElement).src));
        const names = await cards.locator("h2").allTextContents();
        const expectedSources = names.map(name => vendors.find(vendor => vendor.businessName === name)?.imageUrl);
        expect(sources).toEqual(expectedSources);
        for (const image of await cards.locator("img").all()) await expectImageDecoded(image);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (pageNumber === 1) {
          await cards.nth(width === 390 ? 8 : 6).scrollIntoViewIfNeeded();
          await page.screenshot({ path: `.codex-tmp/targeted-diversity/${subcategory}-${width}.png`, scale: "css" });
        }
      }
    }
  }
});

test("reviewed venues retain their corrections on cards and profile pages", async ({ page }) => {
  for (const slug of ["luna-estate-atelier-03", "olive-estate-house-05", "lark-estate-and-co-09", "velvet-estate-atelier-11"]) {
    const vendor = vendors.find((entry) => entry.slug === slug)!;
    await page.goto(`/vendors?search=${encodeURIComponent(vendor.businessName)}`);
    const card = page.locator("article.vendor-card").filter({ has: page.getByRole("heading", { name: vendor.businessName, exact: true }) });
    await expect(card).toContainText(vendor.locationCity!);
  }
  for (const name of ["Noya", "Mosaic"]) {
    const vendor = vendors.find((entry) => entry.businessName === name)!;
    await page.goto(`/vendors/${vendor.slug}`);
    await expectImageDecoded(page.getByRole("img", { name: `Demo venue portfolio image for ${name}`, exact: true }));
  }
  await page.goto("/vendors/velvet-estate-atelier-11");
  await expect(page.getByRole("heading", { name: "Citrus", exact: true })).toBeVisible();
});

test("marketplace filtering and pagination use the expanded fallback dataset", async ({ page }) => {
  await page.goto("/vendors?subcategory=videographers");
  await expect(page.getByText("22 vendors", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(12);
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/subcategory=videographers.*page=2|page=2.*subcategory=videographers/);
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(10);

  await page.goto("/vendors?category=photography-content&service=Drone&area=south");
  const resultCount = await page.locator("article").count();
  expect(resultCount).toBeGreaterThan(0);
  expect(resultCount).toBeLessThanOrEqual(12);
});

test("venue feedback appears with current versioned covers and calculated ratings", async ({ page }) => {
  test.setTimeout(90_000);
  const reviewedVenues = vendors.filter((entry) => entry.subcategorySlug === "wedding-venues" && entry.imageUrl?.includes("?v="));
  for (const vendor of reviewedVenues) {
    await page.goto(`/vendors?search=${encodeURIComponent(vendor.businessName)}`);
    const card = page.locator("article.vendor-card").filter({ has: page.getByRole("heading", { name: vendor.businessName, exact: true }) });
    const image = card.getByRole("img", { name: vendor.imageAlt, exact: true });
    expect(decodeURIComponent((await image.getAttribute("src")) ?? "")).toContain(vendor.imageUrl);
    await expectImageDecoded(image);
    await expect(card).toContainText(vendor.locationCity!);
    await expect(card.getByText(/Serves:/)).toHaveCount(0);
    if (vendor.ratingAverage != null) await expect(card.getByText(vendor.ratingAverage.toFixed(1), { exact: true })).toBeVisible();
  }
  await page.goto("/vendors/south-estate-house-21");
  await expect(page.getByText("4.2 · 3 reviews", { exact: true })).toBeVisible();
  await expect(page.getByText(/Serves:/)).toHaveCount(0);
  await expect(page.getByText(/Physical area:/)).toBeVisible();
  await expect(page.locator("article")).toHaveCount(3);
});

test("priority photography categories show 22 distinct decoded covers across both pages", async ({ page }) => {
  test.setTimeout(90_000);
  for (const subcategory of ["wedding-photographers", "videographers", "magnet-photographers"]) {
    const seen = new Set<string>();
    for (const pageNumber of [1, 2]) {
      await page.goto(`/vendors?subcategory=${subcategory}&page=${pageNumber}`);
      const images = page.locator("article img");
      await expect(images).toHaveCount(pageNumber === 1 ? 12 : 10);
      for (const image of await images.all()) {
        await expectImageDecoded(image);
        const source = new URL((await image.getAttribute("src"))!, "http://localhost");
        const cover = source.searchParams.get("url") ?? source.pathname;
        expect(seen.has(cover)).toBe(false);
        seen.add(cover);
      }
    }
    expect(seen.size).toBe(22);
  }
});

test("North, Terra and Golden photography feedback appears on marketplace cards and profiles", async ({ page }) => {
  await page.goto(`/vendors?search=${encodeURIComponent("Golden Photography Atelier")}`);
  const golden = page.locator("article.vendor-card").filter({ has: page.getByRole("heading", { name: "Golden Photography Atelier", exact: true }) });
  await expect(golden.getByText("3.9", { exact: true })).toBeVisible();
  await expect(golden).toContainText("8,000");
  await expect(golden).toContainText("11,000");
  await page.goto(`/vendors?search=${encodeURIComponent("North Photography Workshop")}`);
  const north = page.locator("article.vendor-card").filter({ has: page.getByRole("heading", { name: "North Photography Workshop", exact: true }) });
  await expect(north.getByText("4.8", { exact: true })).toBeVisible();
  await expect(north.getByText("Central District", { exact: true })).toHaveCount(0);
  await expect(north.getByText(/Serves: Central Israel · North/)).toBeVisible();
  await page.goto(`/vendors?search=${encodeURIComponent("Terra Photography & Co.")}`);
  const terra = page.locator("article.vendor-card").filter({ has: page.getByRole("heading", { name: "Terra Photography & Co.", exact: true }) });
  await expect(terra.getByText("4.0", { exact: true })).toBeVisible();
  await page.goto("/vendors/north-photography-workshop-15");
  await expect(page.getByText("4.8 · 1 reviews", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(1);
});

test("Juniper uses the corrected magnet orientation asset on its card and profile", async ({ page }) => {
  const vendor = vendors.find((entry) => entry.slug === "juniper-magnets-and-co-08")!;
  expect(vendor.imageUrl).toMatch(/magnet-photographers-08\.webp\?v=[a-f0-9]{12}$/);
  for (const route of [`/vendors?search=${encodeURIComponent(vendor.businessName)}`, `/vendors/${vendor.slug}`]) {
    await page.goto(route);
    const image = page.getByRole("img", { name: vendor.imageAlt, exact: true }).first();
    await expectImageDecoded(image);
    expect(decodeURIComponent((await image.getAttribute("src")) ?? "")).toContain(vendor.imageUrl);
  }
});

test("private Couple route redirects to sign in when Supabase is not configured", async ({ page }) => {
  await page.goto("/wedding");
  await expect(page).toHaveURL(/\/auth\/couple/);
  await expect(page.getByRole("status")).toHaveText("Please sign in to continue");
  await expect(page.getByRole("link", { name: "Already have an account? Sign in", exact: true })).toBeVisible();
});
