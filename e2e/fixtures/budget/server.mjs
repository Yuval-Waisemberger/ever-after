// Isolated component host: no Next route, Supabase client, credentials or live writes.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
const require = createRequire(import.meta.resolve("vitest"));
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const server = await createServer({
  configFile: false, envFile: false, root: fileURLToPath(new URL("./", import.meta.url)),
  cacheDir: fileURLToPath(new URL("../../../.codex-tmp/budget-vite", import.meta.url)),
  resolve: { alias: {
    "next/link": fileURLToPath(new URL("./link.tsx", import.meta.url)),
    "@/lib/queries/budget": fileURLToPath(new URL("./page-data.ts", import.meta.url)),
    "@/lib/queries/guests": fileURLToPath(new URL("./page-data.ts", import.meta.url)),
    "@/lib/actions/guests": fileURLToPath(new URL("./actions.ts", import.meta.url)),
    "@/lib/actions/budget": fileURLToPath(new URL("./actions.ts", import.meta.url)),
    "@": fileURLToPath(new URL("../../../src", import.meta.url)),
  } },
  esbuild: { jsx: "automatic" }, css: { postcss: { plugins: [tailwind()] } },
  server: { host: "127.0.0.1", port: 3102, strictPort: true },
});
await server.listen();
