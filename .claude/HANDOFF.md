# HANDOFF

> Histórico de sessões. Leia SESSION_RESUME.md para o estado atual.

---

## Sessão: 2026-06-01 (parte 2) — Modal checkout + Login + Suporte + Segurança

### Commits desta sessão
```
43c2c05  feat: modal de checkout do plano antes de ir ao Mercado Pago
862f5e8  feat: tela de login personalizada com Google (sem UI do Clerk)
3e2f311  fix: admin consegue ver e responder tickets de suporte
```

### O que foi feito

**Modal de pré-checkout do plano**
- Novo `src/components/PlanCheckoutModal.tsx`: ao clicar "Assinar" no dashboard, abre janela
  com benefícios do plano, "Cancele quando quiser", preço. Só então vai pro Mercado Pago.
- Benefícios vêm de `plan.recursos` (campo editável no admin). Fallback `DEFAULT_PLAN_BENEFITS`
  garante que o modal não fique vazio antes de preencher.
- `dashboard.tsx` (SubscriptionCard): botão agora seta `selectedPlan` → abre modal.

**Tela de login 100% CuidandoVC (sem UI do Clerk)**
- `src/components/AuthScreen.tsx`: logo, botão "Entrar com Google" (OAuth direto via
  `useSignIn().authenticateWithRedirect`), benefícios, selos de confiança.
- `src/routes/sso-callback.tsx`: completa o handshake OAuth (`AuthenticateWithRedirectCallback`).
- `sign-in.tsx` e `sign-up.tsx` passaram a renderizar `<AuthScreen>`.
- PT-BR: `@clerk/localizations` instalado, `localization={ptBR}` no ClerkProvider.
- ⚠️ Requer Google habilitado em Clerk → Social Connections.

**Suporte admin desbloqueado (bug de permissão)**
- Causa: `fetchAllTickets` / `sendTicketMessage` exigem `ADMIN_CLERK_IDS`, mas a variável
  não estava configurada → "Acesso negado" silencioso → aba mostrava "Nenhum chamado".
- A estatística aparecia porque `fetchAdminOverview` usa `requireAdminAccess` (no-op).
- Correção: `ADMIN_CLERK_IDS` configurado no Vercel (production + development) com 3 IDs.
- UI de erro explícita adicionada no `AdminSuporteTab` quando carregamento falha.
- Chat bidirecional médico↔admin agora funciona (código já estava pronto).

**Deploys deduplicados (sessão anterior)**
- Removido `.github/workflows/deploy.yml` (Deploy Hook redundante; GitHub App já deploya).
- REGRA: só `git push`. Nunca `vercel deploy --prod` manual.

### Arquivos modificados
```
src/components/PlanCheckoutModal.tsx  (novo)
src/components/AuthScreen.tsx         (novo)
src/routes/sso-callback.tsx           (novo)
src/routes/sign-in.tsx                (reescrito)
src/routes/sign-up.tsx                (reescrito)
src/routes/__root.tsx                 (ptBR no ClerkProvider)
src/routes/dashboard.tsx              (SubscriptionCard usa modal)
src/routes/admin.tsx                  (erro explícito no AdminSuporteTab)
.github/workflows/deploy.yml          (removido)
```

### Pendências abertas desta sessão
- Gates de segurança do `/admin` ainda são no-op (ver SESSION_RESUME → próximos passos #1).
- Google OAuth precisa ser habilitado no painel do Clerk.

---

## Sessão: 2026-06-01 (parte 1) — Webhook MP + Validação de pagamento

### Commits desta sessão
```
cec9d05  fix: corrige webhook MP para ativar assinatura com fluxo dinâmico
459c9fb  fix: corrige URL do webhook MP no guia do admin
4d2c7c0  chore: remove workflow deploy hook redundante
b73f28f  docs: registra validação MP em produção + regra de deploy único
```

### O que foi feito

**Webhook MP corrigido (2 bugs fatais)**
- Bug 1: lia `process.env.MERCADOPAGO_ACCESS_TOKEN` (sempre vazio, token fica no DB) →
  agora usa `getMPAccessToken()` (DB-first).
- Bug 2: `external_reference` do checkout novo é `{professionalId, planId}` (UUID), mas o
  webhook esperava `{plan}` (tier string) → agora resolve tier via `planToTier(plan)` buscando
  no DB. Compat com formato legado mantida.
- Extras: seta `planId` + `periodoFimEm` (+1 mês) na ativação; validação HMAC-SHA256 da
  assinatura do webhook (exigida só se `mpWebhookSecret` configurado).
- URL no guia da aba Integrações corrigida: era `/api/webhooks/mercadopago`, certo é `/api/webhooks/mp`.

**Teste de pagamento em produção**
- Chaves de produção (`APP_USR-`) configuradas via Admin → Integrações.
- Webhook configurado no painel MP → entregando `200 OK`.
- Checkout chegou até confirmação com plano dinâmico correto ("CuidandoVC Profissional — R$79,90").
- Pagamento recusado: `cc_rejected_high_risk` (antifraude MP) — NÃO é bug. Causa confirmada
  via API: valor R$1 + auto-compra + conta nova. Com médico real isso não ocorre.

---

## Sessão: 2026-05-31 — Planos dinâmicos + Integrações MP + Reconciliação git

### Commits desta sessão
```
5881db6  feat: liga planos do admin ao dashboard do médico + integrações MP no admin
76df2e3  docs: atualiza handoff e session resume
```

### O que foi feito

**Reconciliação git**
- Repo local estava 9 commits atrás do origin/main (trabalho feito em outro PC).
- Rebase resolvendo conflitos em `settings.tsx` e `index.tsx` (APP_DOMAIN dinâmico).

**Sistema de planos dinâmicos (Admin → DB → Dashboard → Checkout)**
- Migration `0012_integracoes_planos.sql` (JÁ APLICADA no banco de produção):
  - Tabela `integration_config` (chaves MP, singleton).
  - Coluna `subscriptions.plan_id` (UUID → tabela `plans`).
- `src/lib/integrations.ts`: `fetchIntegrationConfig` / `updateIntegrationConfig` (admin,
  segredos mascarados) + `getMPAccessToken()` / `getMPWebhookSecret()` (DB-first, fallback env).
- `src/lib/plans.ts`: `fetchActivePlans()` + `planToTier()`.
- `src/lib/mp-subscription.ts`: aceita `{planId: UUID}`, cria preapproval inline com
  `transaction_amount = plan.precoMensal`. Plano grátis ativa direto sem MP.
- `src/routes/dashboard.tsx` (`SubscriptionCard`): planos do DB, botões dinâmicos.
- Admin (`src/routes/admin.tsx` + `AdminSections.tsx`): aba **Integrações** para colar
  chaves do MP (Access Token, Public Key, Client ID/Secret, Webhook Secret).

### Arquivos criados (todos novos)
```
src/lib/integrations.ts
src/lib/plans.ts
src/db/migrations/0012_integracoes_planos.sql
src/components/admin/IntegracoesSection (dentro de AdminSections.tsx)
```

---

## Sessão anterior (antes de 2026-05-31) — feita em outro PC

Trabalho relevante que estava no origin/main mas não no local:
- Admin SaaS completo (`src/routes/admin.tsx`, `src/components/admin/`)
- Sistema de planos no admin (`plan_features`, `fetchPlans`, `upsertPlan`)
- Onboarding (`src/routes/onboarding.tsx`, `src/lib/onboarding.ts`)
- Landing page (`src/routes/index.tsx`)
- Rebranding mediclin → CuidandoVC
