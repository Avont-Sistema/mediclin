/**
 * Custom SSR entry that wraps TanStack Start with Clerk authentication.
 *
 * createClerkHandler intercepts each request before the HTML stream is sent,
 * authenticates it with Clerk (using CLERK_SECRET_KEY), and injects
 * { clerkInitialState } into the router context. ClerkProvider reads this
 * from the context to skip a client-side re-auth round-trip, preventing the
 * flash of unauthenticated content on initial SSR load.
 *
 * --- Compatibilidade Nitro v3 / Vinxi ---
 *
 * @clerk/tanstack-start importa getEvent() de vinxi/http, que internamente faz:
 *   getNitroAsyncContext() → globalThis.app.config.server.experimental.asyncContext
 *
 * O Nitro v3 não seta globalThis.app (só o próprio Vinxi faz isso), gerando:
 *   TypeError: Cannot read properties of undefined (reading 'config')
 *
 * Solução em dois passos:
 *  1. Shim de globalThis.app antes de qualquer código Vinxi ser executado.
 *  2. callAsync() no contexto "nitro-app" (via unctx) por request, para que
 *     getEvent().context retorne um objeto válido (process.env garante as vars).
 *
 * O módulo unctx é deduplicado pelo Rollup/Nitro em _libs/unctx.mjs, então
 * o getContext() aqui compartilha o mesmo namespace que vinxi.mjs usa.
 */
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createClerkHandler } from "@clerk/tanstack-start/server";
import { getContext } from "unctx";
import { AsyncLocalStorage } from "node:async_hooks";

// Shim: o runtime do Vinxi (compilado em _libs/vinxi.mjs pelo Nitro) lê
// globalThis.app.config.server.experimental.asyncContext sem optional chaining.
// Precisa existir ANTES de qualquer chamada a getNitroAsyncContext().
type VinxiAppShim = {
  config: { server: { experimental: { asyncContext: boolean } } };
};
type GlobalWithVinxi = typeof globalThis & { app?: VinxiAppShim };
const globalWithVinxi = globalThis as GlobalWithVinxi;
globalWithVinxi.app ??= {
  config: { server: { experimental: { asyncContext: true } } },
};

// Contexto compartilhado com vinxi.mjs via _libs/unctx.mjs (mesmo módulo).
// asyncContext: true → usa AsyncLocalStorage, seguro para requests concorrentes.
const nitroCtx = getContext("nitro-app", {
  asyncContext: true,
  AsyncLocalStorage,
});

const clerkHandler = createClerkHandler(
  // as unknown as: incompatibilidade de tipos entre versões do handler — runtime é compatível.
  createStartHandler as unknown as Parameters<typeof createClerkHandler>[0],
);

const _fetch = clerkHandler(defaultStreamHandler) as unknown as (
  request: Request,
  ...args: unknown[]
) => Promise<Response>;

// Wrapper: popula o contexto "nitro-app" por request via callAsync (thread-safe
// com ALS). Fornece um evento sintético com:
//   - context: {} → commonEnvs/getPublicEnvVariables lê de process.env
//   - web.request: a Request real → getWebRequest() retorna event.web.request
//     diretamente (vinxi.mjs: `event.web ??= ...` é skipado quando já populado)
//     sem precisar converter o h3 event (que não existe no Nitro v3).
// Evento sintético com shape mínimo que satisfaz getEvent()/getWebRequest() do Vinxi.
// Apenas .event.context (obrigatório para commonEnvs) e .event.web.request (para getWebRequest)
// são acessados pelo runtime — o restante do H3Event não é necessário.
type SyntheticVinxiContext = {
  event: {
    context: Record<string, unknown>;
    web: { request: Request; url: URL };
  };
};

const fetch = (request: Request, ...args: unknown[]): Promise<Response> => {
  const ctx: SyntheticVinxiContext = {
    event: {
      context: {},
      web: { request, url: new URL(request.url) },
    },
  };
  return nitroCtx.callAsync(ctx, () => _fetch(request, ...args));
};

export default { fetch };
