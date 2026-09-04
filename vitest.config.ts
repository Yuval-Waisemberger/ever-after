import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "jsdom",
    coverage: {
      reporter: ["text", "html"],
      include: ["src/lib/domain/**/*.ts", "src/lib/validation/**/*.ts"],
    },
  },
});
