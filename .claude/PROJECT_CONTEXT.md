# PROJECT CONTEXT

> Contexto imutável. Não atualizar sem discussão.

## Stack
- **Framework**: TanStack Start v1.168 + Vite 7 + Nitro v3
- **Hosting**: Vercel (nitro-nightly preset)
- **DB**: Neon Postgres + Drizzle ORM
- **Auth**: Clerk (@clerk/tanstack-start v0.11.5)
- **Pagamentos**: Mercado Pago SDK v3 (pendente env vars)
- **Email**: Resend (pendente env vars)
- **Estilo**: Tailwind CSS v4 + shadcn/ui
- **Runtime**: Node.js (NÃO Edge — Drizzle + Clerk não funcionam em Edge)

## Multi-tenancy
Toda query ao banco DEVE filtrar por `professional_id` do contexto autenticado (Clerk).
NUNCA confiar em parâmetros de URL para autorização.

## Arquivos críticos
- `src/ssr.ts` — SSR entry + shim Vinxi + Clerk handler
- `vite.config.ts` — Nitro v3 + cloudflare: false
- `src/start.ts` — middleware (webhooks + error)
- `src/db/schema.ts` — schema Drizzle
- `.github/workflows/deploy.yml` — auto-deploy via Deploy Hook

## Pendências do usuário (ação manual necessária)
1. Reinstalar Vercel GitHub App no repo (remover workaround deploy hook)
2. Limpar env vars fantasmas no Vercel: `NEXT_PUBLIC_auth_*` e `auth_CLERK_SECRET_KEY`
3. Adicionar env vars de pagamento (MP, Resend, Twilio)
