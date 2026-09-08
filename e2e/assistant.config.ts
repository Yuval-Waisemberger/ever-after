import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: ["assistant-language.spec.ts", "assistant-visual.spec.ts"], fullyParallel: false, workers: 1,
  reporter: "list", outputDir: "../test-results/assistant", use: { baseURL: "http://127.0.0.1:3101", trace: "retain-on-failure" },
  webServer: { command: `"${process.execPath}" e2e/fixtures/assistant/server.mjs`, cwd: process.cwd(), url: "http://127.0.0.1:3101", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
