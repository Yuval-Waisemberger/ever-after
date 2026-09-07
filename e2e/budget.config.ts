import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "budget-booking.spec.ts", workers: 1, reporter: "list",
  outputDir: "../test-results/budget", use: { baseURL: "http://127.0.0.1:3102", trace: "retain-on-failure" },
  webServer: { command: `"${process.execPath}" e2e/fixtures/budget/server.mjs`, cwd: process.cwd(), url: "http://127.0.0.1:3102", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
