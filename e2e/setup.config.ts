import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "setup-bookings.spec.ts", workers: 1, reporter: "list",
  outputDir: "../test-results/setup", use: { baseURL: "http://127.0.0.1:3103", trace: "retain-on-failure" },
  webServer: { command: `"${process.execPath}" e2e/fixtures/setup/server.mjs`, cwd: process.cwd(), url: "http://127.0.0.1:3103", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
