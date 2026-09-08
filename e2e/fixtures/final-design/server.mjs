// Closed presentation host. No environment files, credentials, live queries or writes.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
const require = createRequire(import.meta.resolve("vitest"));
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const file = path => fileURLToPath(new URL(path, import.meta.url));
const aliases = Object.fromEntries([
  "queries/guests", "queries/budget", "queries/couple-identity", "queries/couple-vendors",
  "actions/guests", "actions/budget", "actions/couple-identity", "actions/vendors", "actions/auth", "supabase/client",
].map(name => [`@/lib/${name}`, file("./data.ts")]));
const server = await createServer({
  configFile: false, envFile: false, root: file("./"), cacheDir: file("../../../.codex-tmp/final-design-vite"), publicDir: file("../../../public"),
  resolve: { alias: { ...aliases, "next/link": file("../vendor-account/link.tsx"), "next/image": file("../discovery/image.tsx"), "next/navigation": file("./navigation.ts"), "@": file("../../../src") } },
  esbuild: { jsx: "automatic" }, css: { postcss: { plugins: [tailwind()] } },
  server: { host: "127.0.0.1", port: 3111, strictPort: true },
});
await server.listen();
