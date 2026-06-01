# HANDOFF

> Template para handoff entre sessões. Preencher ao encerrar uma sessão longa.

## Sessão encerrada em: 2026-05-31

## O que foi feito
- **Reconciliação git**: o repo local estava 9 commits atrás do origin/main (trabalho
  feito em outro PC: admin SaaS, planos, onboarding). Rebase do commit do link público
  por cima do origin/main, resolvendo conflitos em index.tsx e settings.tsx.
- **Link público com domínio dinâmico**: `src/lib/config.ts` (APP_DOMAIN + getPublicPageUrl).
- **Sistema de planos dinâmicos ponta a ponta** (Admin → DB → Dashboard → Checkout):
  - Tabela `integration_config` (chaves MP) + coluna `subscriptions.plan_id` (migration 0012, JÁ aplicada).
  - `lib/integrations.ts`: get/update chaves MP (admin) + `getMPAccessToken()` (DB-first, fallback env).
  - `lib/plans.ts`: `fetchActivePlans` (médico) + `planToTier`.
  - `createMPSubscriptionCheckout` agora aceita `planId` e usa preapproval inline (preço do plano).
  - Dashboard renderiza planos reais do DB (removido hardcode Pro R$79 / Clinic R$199).
  - Admin: nova aba **Integrações** para colar chaves do Mercado Pago.
- **Deploy em produção** (commit 5881db6) — READY, smoke check ok (landing 200, dashboard 307, admin 200).

## O que NÃO foi feito (ficou pendente)
- **Colar as chaves do Mercado Pago** em Admin → Integrações (Access Token, Public Key,
  Client ID/Secret, Webhook Secret). Sem isso, o checkout de assinatura ainda não cobra.
- **Webhook MP** (`mp-webhook.ts`) ainda não foi revisado para atualizar status via assinatura
  inline + planId (atualiza subscription quando MP confirma pagamento). Verificar fluxo.
- Pagamentos de paciente (split/marketplace) em `mercadopago.ts` continuam parciais (stubs).

## Contexto importante que não está no código
- `enum planoEnum` (free/pro/clinic) é tier GROSSEIRO legado; o plano real é `subscriptions.plan_id`
  → tabela `plans` (slug livre: gratis, profissional, etc.). `planToTier` faz a ponte.
- Chaves MP ficam no DB (tabela integration_config), não em env var (decisão do dono).
- Produção = mediclin.vercel.app (auto-deploy do main + `vercel --prod`).

## Próximo passo EXATO
> Dono vai colar as chaves de TESTE do Mercado Pago em Admin → Integrações e testar uma
> assinatura no dashboard de um médico. Depois revisar `src/server/mp-webhook.ts` para
> confirmar que ativa a subscription (status ativa + periodoFimEm) com o novo fluxo inline.

## Arquivos modificados
```
src/lib/config.ts (novo)         src/lib/integrations.ts (novo)
src/lib/plans.ts (novo)          src/db/migrations/0012_integracoes_planos.sql (novo)
src/db/schema.ts                 src/lib/mp-subscription.ts
src/lib/mercadopago.ts           src/lib/dashboard.ts
src/routes/dashboard.tsx         src/routes/admin.tsx
src/routes/settings.tsx          src/routes/index.tsx
src/components/admin/AdminSections.tsx
```

## Comando para retomar
```bash
git log --oneline -5
```
