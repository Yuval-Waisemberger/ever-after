import { expect, test } from "@playwright/test";

// Run against an isolated local server with dummy loopback Supabase configuration.
// No login, signup, record creation or authenticated live session is used.
for (const route of ["/wedding", "/wedding/details", "/wedding/setup", "/tasks", "/budget", "/guests", "/vendors/my", "/assistant", "/settings"]) {
  test(`anonymous ${route} redirects to Couple authentication`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/couple\?/);
    await expect(page.getByRole("status")).toContainText("Please sign in to continue");
  });
}
for (const route of ["/vendor", "/vendor/profile"]) {
  test(`anonymous ${route} redirects to Vendor authentication`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/vendor\?/);
  });
}
test("anonymous Assistant requests reject forged ownership without technical details", async ({ request }) => {
  for (const data of [
    { message: "What is our budget?", threadId: "22222222-2222-4222-8222-222222222222" },
    { message: "What is our budget?", weddingId: "22222222-2222-4222-8222-222222222222" },
  ]) {
    const response = await request.post("/api/assistant", { data });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.errorCode).toBe("AUTH_REQUIRED");
    expect(JSON.stringify(body)).not.toMatch(/stack|postgres|supabase|22222222|budget_items/i);
  }
});
