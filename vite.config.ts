// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// cloudflare: false → desabilita @cloudflare/vite-plugin (Cloudflare Workers format).
// Nitro é o adapter correto para Vercel/Node.js: gera .vercel/output/ que o Vercel
// executa como Serverless Functions, resolvendo o 404 em todas as rotas SSR.
//
// Preset auto-detectado: "vercel" quando VERCEL=1 (build no Vercel CI),
// "node-server" localmente para permitir `node .output/server/index.mjs`.
const nitroPreset = process.env.VERCEL ? "vercel" : "node-server";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    // Usa src/ssr.ts como entry do SSR — já tem createClerkHandler embutido.
    server: { entry: "ssr" },
  },
  vite: {
    plugins: [nitro({ preset: nitroPreset })],
  },
});
