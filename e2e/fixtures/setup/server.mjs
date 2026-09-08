// Isolated component host: no Next route, Supabase client, credentials or live writes.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
const require = createRequire(import.meta.resolve("vitest"));
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const server = await createServer({
  configFile: false, envFile: false, root: fileURLToPath(new URL("./", import.meta.url)),
  cacheDir: fileURLToPath(new URL("../../../.codex-tmp/setup-vite", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../../public", import.meta.url)),
  resolve: { alias: {
    "next/image": fileURLToPath(new URL("../discovery/image.tsx", import.meta.url)),
    "@/lib/actions/auth": fileURLToPath(new URL("../assistant/auth.ts", import.meta.url)),
    "next/link": fileURLToPath(new URL("./link.tsx", import.meta.url)),
    "@/lib/actions/setup-bookings": fileURLToPath(new URL("./actions.ts", import.meta.url)),
    "@/lib/actions/wedding": fileURLToPath(new URL("./actions.ts", import.meta.url)),
    "next/navigation": fileURLToPath(new URL("./navigation.ts", import.meta.url)),
    "@": fileURLToPath(new URL("../../../src", import.meta.url)),
  } },
  esbuild: { jsx: "automatic" }, css: { postcss: { plugins: [tailwind()] } },
  server: { host: "127.0.0.1", port: 3103, strictPort: true },
});
await server.listen();
