// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// cloudflare: false → desabilita @cloudflare/vite-plugin (Cloudflare Workers format).
// Nitro v3 é o adapter para Vercel/Node.js: gera .vercel/output/ (Build Output API)
// que o Vercel executa como Serverless Functions, resolvendo o 404 em todas as rotas SSR.
//
// O problema histórico (globalThis.app undefined) foi resolvido em src/ssr.ts com:
//  1. shim de globalThis.app antes de qualquer código Vinxi rodar
//  2. callAsync() no contexto "nitro-app" compartilhado (via unctx deduplicado pelo Rollup)
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
