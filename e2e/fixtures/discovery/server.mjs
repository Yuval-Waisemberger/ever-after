// Isolated component host: no Next route, Supabase client, credentials or live writes.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
const require = createRequire(import.meta.resolve("vitest"));
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const server = await createServer({
  configFile: false, envFile: false, root: fileURLToPath(new URL("./", import.meta.url)),
  cacheDir: fileURLToPath(new URL("../../../.codex-tmp/discovery-vite", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../../public",import.meta.url)),
  resolve: {alias:{
    "@/lib/actions/auth": fileURLToPath(new URL("../assistant/auth.ts", import.meta.url)),
    "next/link":fileURLToPath(new URL("./link.tsx",import.meta.url)),
    "next/image":fileURLToPath(new URL("./image.tsx",import.meta.url)),
    "next/navigation":fileURLToPath(new URL("./navigation.ts",import.meta.url)),
    "@/components/layout/public-header":fileURLToPath(new URL("./header.tsx",import.meta.url)),
    "@/lib/actions/vendors":fileURLToPath(new URL("./actions.ts",import.meta.url)),
    "@/lib/queries/vendors":fileURLToPath(new URL("./data.ts",import.meta.url)),
    "@/lib/queries/couple-vendors":fileURLToPath(new URL("./data.ts",import.meta.url)),
    "@/lib/queries/wedding":fileURLToPath(new URL("./data.ts",import.meta.url)),
    "@/lib/queries/couple-identity":fileURLToPath(new URL("./data.ts",import.meta.url)),
    "@/lib/queries/vendor-dashboard":fileURLToPath(new URL("./data.ts",import.meta.url)),
    "@/lib/auth/user":fileURLToPath(new URL("./data.ts",import.meta.url)),
    "@":fileURLToPath(new URL("../../../src",import.meta.url)),
  }},
  esbuild: { jsx: "automatic" }, css: { postcss: { plugins: [tailwind()] } },
  define: { "process.env": {} },
  server: { host: "127.0.0.1", port: 3109, strictPort: true },
});
await server.listen();
