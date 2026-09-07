import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "wedding-week.spec.ts", workers: 1, reporter: "list",
  outputDir: "../test-results/wedding-week", use: { baseURL: "http://127.0.0.1:3105", trace: "retain-on-failure" },
  webServer: { command: `"${process.execPath}" e2e/fixtures/wedding-week/server.mjs`, cwd: process.cwd(), url: "http://127.0.0.1:3105", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
