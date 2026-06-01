# SESSION RESUME

> Leia este arquivo PRIMEIRO em toda nova sessão. Atualizado a cada sessão.
> **Se estiver em outro PC: `git pull origin main` antes de qualquer coisa.**

---

## Estado atual (2026-06-01)
- **Produção**: https://mediclin.vercel.app — 100% funcional
- **Branch ativa**: `main` — sincronizada com origin (`git log --oneline -5` pra confirmar)
- **Último commit**: `3e2f311` — fix suporte admin

---

## ⚠️ REGRAS DE OURO (nunca quebrar)

### Deploy
- Deploy é **automático**: basta `git push origin main` → Vercel detecta e deploya.
- **NUNCA rodar `vercel deploy --prod`** manual — gera deploy duplicado.
- O `ci.yml` roda lint/typecheck/build a cada push (não faz deploy, só valida).

### Multi-tenant
- Toda query ao banco **DEVE** filtrar por `professionalId` — nunca vazar dados entre médicos.

### Segredo
- Chaves do Mercado Pago ficam no **DB** (tabela `integration_config`), não em env var.
  - Lidas via `getMPAccessToken()` / `getMPWebhookSecret()` em `src/lib/integrations.ts`.
- NUNCA commitar `.env`, `.env.local` ou qualquer arquivo com segredos.

---

## Arquitetura do produto

```
Admin (/admin)  →  DB  →  Dashboard do Médico (/dashboard)  →  Página Pública (/:slug)
```

- `/admin` = backoffice SaaS (gerencia planos, tickets, flags, integrações)
- `/dashboard`, `/agenda`, `/settings` = painel do médico
- `/:slug` = link da bio do Instagram do médico (página pública do paciente)
- **Fluxo de assinatura**: médico assina plano no dashboard → Mercado Pago (preapproval) → webhook ativa subscription no DB

---

## Stack
| Camada | Tech |
|---|---|
| Framework | TanStack Start + Vite (SSR nativo) |
| Banco | Neon Postgres + Drizzle ORM |
| Auth | Clerk (Google OAuth — tela de login 100% customizada) |
| Pagamentos | Mercado Pago (assinatura médico) + Mercado Pago Connect (pagamento paciente, pendente) |
| Deploy | Vercel (Fluid Compute, Node.js) |
| Emails | Resend (configurado, implementação pendente) |
| Estilo | Tailwind CSS v4 + shadcn/ui |

---

## Sistema de planos (como funciona)

- Planos ficam na tabela `plans` (geridos em Admin → Financeiro → Planos).
- Planos **ativos** hoje: **Grátis (R$0)** e **Profissional (R$79,90)**.
- `enum planoEnum` (free/pro/clinic) é **tier grosseiro legado** — o plano real é `subscriptions.plan_id` → UUID da tabela `plans`. A função `planToTier()` em `src/lib/plans.ts` faz a ponte.
- Checkout: médico clica → modal de preview (`PlanCheckoutModal`) → "Continuar para pagamento" → Mercado Pago preapproval inline (sem planos pré-criados no MP).
- Ativação: MP chama `/api/webhooks/mp` → `src/server/mp-webhook.ts` → subscription vira `ativa` + seta `planId` + `periodoFimEm`.

---

## Mercado Pago — estado

- Chaves de **produção** (`APP_USR-`) configuradas em Admin → Integrações (salvas no DB).
- Webhook URL no painel MP: `https://mediclin.vercel.app/api/webhooks/mp` — entregando `200`.
- Integração validada (preapproval criado, plano dinâmico correto, webhook entregando).
- Teste de auto-compra R$1 foi recusado por antifraude do MP (`cc_rejected_high_risk`) — **NÃO é bug**. Causa: valor R$1 + comprador = vendedor + conta nova. Com médico real (outro CPF/dispositivo, valor normal) funciona.

---

## Autenticação (Clerk)

- Tela de login: **100% customizada** em `src/components/AuthScreen.tsx` — cliente não vê UI do Clerk.
- Fluxo: `/sign-in` → botão "Entrar com Google" → OAuth Google → `/sso-callback` → `/onboarding`.
- PT-BR aplicado via `@clerk/localizations` no `ClerkProvider` (`src/routes/__root.tsx`).
- ⚠️ Para Google funcionar: habilitar Google em **Clerk → User & Authentication → Social Connections**.
- ⚠️ Faixa "Development mode" desaparece só quando criar instância de **produção** no Clerk (`pk_live_`).

---

## Admin — configuração de segurança

- **`ADMIN_CLERK_IDS`** configurado no Vercel (production + development) com 3 IDs:
  - `user_3EC8bYDQQ0UUw0b3jAoqMOYPuXO` — regesjunioroficial8@gmail.com (dono)
  - `user_3E57GiSXCZOWtAaUlEJHrV1nIPL` — vccuidando@gmail.com (drfelipe)
  - `user_3EPcXy9KEd3OY0o3gx4wNVF88BC` — vedasitesmart@gmail.com
- Gates de admin em `src/lib/support.ts` usam essa variável corretamente.
- ⚠️ Gates em `src/lib/admin.ts`, `src/lib/integrations.ts`, `src/lib/saas-admin.ts` ainda são **no-op** (TODO no código) — qualquer médico logado tecnicamente acessa `/admin`. Travar antes de ter médicos reais.

---

## Próximos passos (por prioridade)

1. **Fechar gates de segurança do `/admin`** — `requireAdminAccess()` é no-op em admin.ts, integrations.ts, saas-admin.ts. Travar com `ADMIN_CLERK_IDS` antes de ter médicos reais.
2. **1º médico real** assinar → valida pagamento ponta-a-ponta via webhook (ativa subscription).
3. **Colar Assinatura Secreta do webhook** no Admin → Integrações (segurança extra contra chamadas falsas ao webhook).
4. **Pagamentos de paciente** (split/marketplace) em `src/lib/mercadopago.ts` — stubs, não implementado.
5. **Emails (Resend)** — chave configurada, templates e disparos pendentes.
6. **Checklist de recursos por plano** — estrutura existe (`plan_features`), enforcement pendente para futura versão multi-clínica.

---

## Comandos rápidos

```bash
git log --oneline -10       # ver estado do repo
git pull origin main        # sincronizar (outro PC)
npm run typecheck           # deve passar sem erros
npm run build               # ~26s
vercel env ls               # ver variáveis de ambiente na produção
```

---

## Arquivos-chave para entender o projeto

```
src/db/schema.ts                    # todas as tabelas
src/lib/plans.ts                    # planos públicos + planToTier
src/lib/integrations.ts             # chaves MP (DB-first) + getMPAccessToken
src/lib/mp-subscription.ts          # checkout de assinatura (médico → MP)
src/server/mp-webhook.ts            # ativa subscription quando MP confirma
src/routes/dashboard.tsx            # painel do médico (SubscriptionCard)
src/routes/admin.tsx                # backoffice SaaS (AdminSuporteTab incluso)
src/components/PlanCheckoutModal.tsx # modal de preview antes do checkout
src/components/AuthScreen.tsx       # tela de login customizada (sem UI do Clerk)
src/routes/sso-callback.tsx         # completa handshake OAuth Google
src/lib/support.ts                  # tickets de suporte (bidirecional médico↔admin)
.claude/HANDOFF.md                  # histórico detalhado de cada sessão
```
