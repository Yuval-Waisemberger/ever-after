// Local-only presentation fixture. No environment files, credentials or Supabase access.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
const require = createRequire(import.meta.resolve("vitest"));
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const file = path => fileURLToPath(new URL(path, import.meta.url));
const server = await createServer({
  configFile: false, envFile: false, root: file("./"), cacheDir: file("../../../.codex-tmp/vendor-account-vite"), publicDir: file("../../../public"),
  define: { "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify("") },
  resolve: { alias: {
    "next/link": file("./link.tsx"), "next/image": file("../discovery/image.tsx"),
    "@/lib/actions/vendor-profile": file("./data.ts"), "@/lib/actions/vendor-identity": file("./data.ts"), "@/lib/queries/vendor-dashboard": file("./data.ts"),
    "@/lib/actions/auth": file("./data.ts"), "@/lib/supabase/client": file("./data.ts"),
    "@": file("../../../src"),
  } }, esbuild: { jsx: "automatic" }, css: { postcss: { plugins: [tailwind()] } },
  server: { host: "127.0.0.1", port: 3110, strictPort: true },
});
await server.listen();
