import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "public-auth-feedback.spec.ts", workers: 1, reporter: "list",
  outputDir: "../test-results/public-auth-feedback",
  use: { baseURL: "http://127.0.0.1:3108", trace: "retain-on-failure" },
  webServer: {
    command: `"${process.execPath}" e2e/fixtures/public-auth/server.mjs`, cwd: process.cwd(),
    url: "http://127.0.0.1:3108", reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
