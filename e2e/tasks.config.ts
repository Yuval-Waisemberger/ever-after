import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "tasks.spec.ts", workers: 1, reporter: "list",
  outputDir: "../test-results/tasks", use: { baseURL: "http://127.0.0.1:3104", trace: "retain-on-failure" },
  webServer: { command: `"${process.execPath}" e2e/fixtures/tasks/server.mjs`, cwd: process.cwd(), url: "http://127.0.0.1:3104", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
