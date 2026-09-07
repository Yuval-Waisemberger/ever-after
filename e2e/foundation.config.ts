import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "visual-foundation.spec.ts", workers: 1, reporter: "list",
  outputDir: "../test-results/foundation",
  use: { baseURL: "http://127.0.0.1:3107", trace: "retain-on-failure" },
  webServer: {
    command: `"${process.execPath}" e2e/fixtures/foundation/server.mjs`, cwd: process.cwd(),
    url: "http://127.0.0.1:3107", reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
