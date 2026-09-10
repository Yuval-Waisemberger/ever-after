// No environment files, Supabase clients, real auth requests or live writes.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
const require = createRequire(import.meta.resolve("vitest"));
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const server = await createServer({
  configFile: false, envFile: false, root: fileURLToPath(new URL("./", import.meta.url)),
  cacheDir: fileURLToPath(new URL("../../../.codex-tmp/public-auth-vite", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../../public", import.meta.url)),
  resolve: { alias: {
    "next/image": fileURLToPath(new URL("../discovery/image.tsx", import.meta.url)),
    "next/link": fileURLToPath(new URL("../tasks/link.tsx", import.meta.url)),
    "@/lib/actions/auth": fileURLToPath(new URL("./actions.ts", import.meta.url)),
    "@/lib/auth/user": fileURLToPath(new URL("./public-user.ts", import.meta.url)),
    "next/navigation": fileURLToPath(new URL("./public-user.ts", import.meta.url)),
    "@": fileURLToPath(new URL("../../../src", import.meta.url)),
  } },
  esbuild: { jsx: "automatic" }, css: { postcss: { plugins: [tailwind()] } },
  server: { host: "127.0.0.1", port: Number(process.env.VISUAL_AUTH_PORT ?? 3108), strictPort: true },
});
await server.listen();
