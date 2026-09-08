import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "final-design.spec.ts", workers: 1, reporter: "list",
  outputDir: "../test-results/final-design",
  use: { baseURL: "http://127.0.0.1:3111", trace: "retain-on-failure" },
  webServer: { command: `"${process.execPath}" e2e/fixtures/final-design/server.mjs`, cwd: process.cwd(), url: "http://127.0.0.1:3111", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
