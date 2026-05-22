# DECISIONS

> Decisões arquiteturais tomadas. Não rever sem discussão explícita.

## ⚠️ ARQUITETURA FUNDAMENTAL (não questionar)

O MediClin é UM ecossistema — dashboard do médico e página pública são partes do mesmo sistema.
- Dashboard = backoffice (médico configura tudo)
- Página pública `/:slug` = frontend do paciente (consome as configs do médico)
- Toda feature deve considerar os DOIS lados: o que o médico configura E como aparece pro paciente
- A página pública NUNCA tem dados hardcoded — sempre vem do banco via configurações do médico

---

## Decisões fixas

| Decisão | Motivo |
|---------|--------|
| Runtime Node.js, não Edge | Drizzle + Clerk SDK exigem Node APIs |
| Sem Cloudflare Workers | Migração para Vercel nativo |
| Nitro v3 preset `vercel` | SSR + serverless functions |
| Clerk auth | Multi-tenant pronto + webhooks confiáveis |
| Mercado Pago (não Stripe) | Mercado brasileiro, facilidade de split |
| Drizzle ORM | Type-safe, sem magia, migrations explícitas |
| Tenant isolado por `professional_id` | Segurança multi-tenant |

## Workarounds ativos

| Workaround | Por quê | Quando resolver |
|------------|---------|-----------------|
| Deploy via Hook (não GitHub App) | Vercel GitHub App foi desinstalada | Usuário reinstalar Vercel GitHub App |
| Shim `globalThis.app` em `src/ssr.ts` | Nitro v3 não seta global que Clerk precisa | Aguardar fix upstream |

## Histórico de problemas críticos resolvidos
- HTTP 500 em todas rotas → shim unctx em ssr.ts (commit `12656d1`)
- Clerk "Resource not found" → mismatch de keys, corrigida VITE_CLERK_PUBLISHABLE_KEY
