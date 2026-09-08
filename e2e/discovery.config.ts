import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
  testDir:".",testMatch:"discovery-motion.spec.ts",workers:1,reporter:"list",
  outputDir:"../test-results/discovery",use:{baseURL:"http://127.0.0.1:3109",trace:"retain-on-failure"},
  webServer:{cwd:process.cwd(),command:`"${process.execPath}" e2e/fixtures/discovery/server.mjs`,url:"http://127.0.0.1:3109",reuseExistingServer:false},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
});
