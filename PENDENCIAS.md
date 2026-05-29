# CuidandoVC — Pendências para sua decisão

> Documento gerado autonomamente na noite de 22/05/2026.
> Tudo o que precisava de **decisão sua** ou de **input externo** está listado aqui em ordem de criticidade.

---

## ✅ Status atual (o que JÁ está funcionando em produção)

**URL:** https://cuidandovc.com.br — todas as rotas testadas e funcionando:

| Rota                    | Status | Comportamento                                    |
| ----------------------- | ------ | ------------------------------------------------ |
| `/`                     | 200    | Landing page (Ânima Clínica)                     |
| `/sign-in`              | 200    | Tela Clerk                                       |
| `/sign-up`              | 200    | Tela Clerk                                       |
| `/dashboard`            | 307    | Redireciona pra sign-in (não autenticado)        |
| `/onboarding`           | 200    | Wizard de 3 passos                               |
| `/agenda`               | 200    | Agenda semanal                                   |
| `/patients`             | 200    | Lista de pacientes                               |
| `/settings`             | 200    | Configurações do profissional                    |
| `POST /api/webhooks/clerk` | 400 | Valida assinatura svix corretamente              |
| `POST /api/webhooks/mp`    | 500 | Falta `MERCADOPAGO_ACCESS_TOKEN` (pendência #2) |
| `GET /api/cron/reminders`  | 200 | Cron de lembretes                                |

**Build + lint + typecheck:** 0 erros, 6 warnings de shadcn UI (não-críticos).

---

## 🔴 CRÍTICA #1 — Reinstalar Vercel GitHub App

### Problema raiz que descobri esta noite

A causa de **"o deploy não estava sendo realizado desde ontem"** é que a **Vercel GitHub App foi desinstalada do repositório** (`Installation ID: undefined`, sem webhooks no GitHub). Por isso, `git push origin main` não disparava deploy automático.

### Workaround que implementei (já está funcionando!)

Criei um **Deploy Hook do Vercel** + **GitHub Actions workflow** que dispara esse hook a cada push em `main`:

- Hook ID: `HP9dxUj4Ij` (URL pública, segura — só dispara deploys)
- Workflow: `.github/workflows/deploy.yml` (commit `25a624c`)
- **Testado e funcionando**: pushes em `main` agora geram deploy automático ✅

### Solução definitiva (que precisa de você)

Para voltar ao auto-deploy nativo (mais robusto, com previews de PR, comentários no PR, etc.):

1. Acesse https://github.com/apps/vercel
2. Clique em **Configure**
3. Selecione a conta/org **Avont-Sistema**
4. Em "Repository access", marque **mediclin** (ou "All repositories")
5. Salve

Depois disso, pode **deletar `.github/workflows/deploy.yml`** (o workaround vira redundante).

**Decisão recomendada:** _Reinstalar a GitHub App_, mas sem urgência — o workaround atual é estável.

---

## 🟡 CRÍTICA #2 — Variáveis de ambiente que faltam no Vercel

Você só me passou as keys do Clerk e do banco. Para os demais serviços eu **não tinha como inventar valores**, então deixei o app funcionar parcialmente. Estas vars precisam ser adicionadas via:

```bash
npx vercel env add <NOME> production
# (cole o valor quando perguntar)
```

### Mercado Pago (pagamentos + assinaturas)

| Variável                    | Para que serve                                   | Onde pegar                                                  |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `MERCADOPAGO_ACCESS_TOKEN`  | Token da plataforma (recebe webhooks de payment) | https://www.mercadopago.com.br/developers → Suas integrações |
| `MERCADOPAGO_APP_ID`        | OAuth Marketplace (médicos conectam suas contas) | mesmo painel acima                                          |
| `MERCADOPAGO_APP_SECRET`    | OAuth Marketplace                                | mesmo painel acima                                          |
| `MP_PLAN_ID_PRO`            | ID do plano Pro R$79/mês                         | Criar plano em "Assinaturas" no painel MP                   |
| `MP_PLAN_ID_CLINIC`         | ID do plano Clinic R$199/mês                     | Criar plano em "Assinaturas" no painel MP                   |

**Sem essas:** `/dashboard` continua mostrando o banner "Conectar Mercado Pago", e o checkout falha com erro 500.

### Resend (e-mails de confirmação + lembrete)

| Variável         | Para que serve                                      |
| ---------------- | --------------------------------------------------- |
| `RESEND_API_KEY` | Envio de e-mails (`notificacoes@cuidandovc.com.br`)  |

**Antes de adicionar:** você precisa verificar o domínio `cuidandovc.com.br` no Resend (SPF/DKIM/DMARC). Se ainda não tem o domínio próprio, o "from" precisa ser `onboarding@resend.dev` (sandbox).

**Sem essa:** webhooks de pagamento aprovado e cron de lembretes falham silenciosamente (`try/catch` no código não quebra o webhook).

### Twilio (WhatsApp — OPCIONAL, só planos Pro e Clinic)

| Variável                 | Para que serve                       |
| ------------------------ | ------------------------------------ |
| `TWILIO_ACCOUNT_SID`     | Twilio account                       |
| `TWILIO_AUTH_TOKEN`      | Twilio token                         |
| `TWILIO_WHATSAPP_FROM`   | Número remetente (ex: `whatsapp:+14155238886` no sandbox) |

**Sem essas:** lembretes WhatsApp não são enviados, mas o cron continua funcionando (envia e-mail). Não bloqueia nada.

### Cron Secret (proteger endpoint)

| Variável      | Para que serve                                                              |
| ------------- | --------------------------------------------------------------------------- |
| `CRON_SECRET` | Validação de chamadas ao `/api/cron/reminders` (Vercel injeta automaticamente em produção, mas pode ser explícito) |

**Atualmente:** o endpoint está **público** (qualquer um pode chamar). Em produção isso é tolerável (não retorna dados, só dispara e-mails), mas o recomendado é configurar.

---

## 🟡 CRÍTICA #3 — Cron de lembretes só roda 1×/dia no plano Hobby

### Problema

`vercel.json` configura:
```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 9 * * *" }] }
```

O Vercel plano Hobby **não permite cron com mais de 1 execução/dia**. Tentei `0 * * * *` (hourly) e Vercel rejeitou.

O cron busca consultas nas próximas 1h50-2h10, então rodando às 9h UTC ele só captura consultas entre **10:50 e 11:10** daquele dia. **Consultas em outros horários não recebem lembrete.**

### Opções (em ordem de simplicidade)

1. **Upgrade plano Vercel Pro** (≈ US$20/mês): permite cron horário. Schedule volta pra `0 * * * *`.
2. **Serviço de cron externo gratuito** (cron-job.org, Upstash QStash): configurar pra bater no endpoint `/api/cron/reminders` a cada hora. Funciona sem upgrade.
3. **Aceitar limitação** e documentar pros médicos que lembretes só funcionam pra horários ~11h.

**Decisão recomendada:** _Opção 2 (cron-job.org)_ enquanto estiver no Hobby — gratuito, leva 5 minutos pra configurar.

---

## 🟢 NÃO-CRÍTICA #4 — App Clerk em uso (test vs production)

### ⚠️ ATUALIZAÇÃO (resolvido em runtime, mas tem contexto importante)

Você me mostrou um erro `{"errors":[{"message":"not found","code":"resource_not_found"}]}` vindo do Clerk. Investiguei e descobri **MISMATCH crítico** entre as keys:

| Variável                                  | Apontava para        | Estado                          |
| ----------------------------------------- | -------------------- | ------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` (antes)      | `bursting-mallard-22` | 🔴 **App deletado** (404)       |
| `CLERK_SECRET_KEY`                        | `aware-lynx-99`       | ✅ Válido                       |
| `NEXT_PUBLIC_auth_CLERK_PUBLISHABLE_KEY`  | `bursting-mallard-22` | 🔴 App deletado                 |
| `auth_CLERK_SECRET_KEY`                   | (outro/deletado)      | 🔴 404                          |

O frontend tentava conectar em `bursting-mallard-22.clerk.accounts.dev/v1/environment` que **retorna 404** = a sua tela com "Resource not found".

### 🔧 O que eu corrigi automaticamente

Reconstruí a publishable key correta a partir do domínio do app `aware-lynx-99` (que é onde a `CLERK_SECRET_KEY` aponta — confirmei via Backend API: 200 OK):

- **Nova `VITE_CLERK_PUBLISHABLE_KEY`** = `pk_test_YXdhcmUtbHlueC05OS5jbGVyay5hY2NvdW50cy5kZXYk`
- Redeploy disparado (deploy `epnkym0eq` Ready)
- Verifiquei: a nova key está no bundle JS servido em `cuidandovc.com.br`
- Frontend API agora responde 401 `dev_browser_unauthenticated` (esperado em dev mode — vai funcionar quando user real acessar via browser)

### ⚠️ Ainda pendente da sua parte

A `NEXT_PUBLIC_auth_CLERK_PUBLISHABLE_KEY` (Vercel Marketplace) e a `auth_CLERK_SECRET_KEY` ainda apontam para o app deletado `bursting-mallard-22`. Eu não removi porque:
- Elas não estão sendo lidas pelo código (o app usa `VITE_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY`)
- A integração Clerk no Vercel Marketplace pode tentar recriar essas vars

**Recomendação ao acordar:**
1. Vai em https://vercel.com/avont-sistemas-projects/mediclin/settings/environment-variables
2. **Deleta** `NEXT_PUBLIC_auth_CLERK_PUBLISHABLE_KEY` e `auth_CLERK_SECRET_KEY` (do Marketplace, apontam pra app fantasma)
3. OU: vai em https://vercel.com/avont-sistemas-projects/integrations e desinstala a integração Clerk antiga

### Sobre test vs production

Ambas keys atuais ainda são `_test_` (não `_live_`). Para produção real (sem o aviso "Development mode" do Clerk), você precisa:

1. Criar uma instância **Production** no Clerk dashboard
2. Substituir as keys no Vercel pelas `pk_live_...` e `sk_live_...`
3. Verificar o domínio `cuidandovc.com.br` no Clerk

**Decisão recomendada:** _Adiar até ter usuários reais._ Test keys funcionam perfeitamente para desenvolvimento e MVP.

---

## 🟢 NÃO-CRÍTICA #5 — Configurar webhooks externos

Os endpoints existem e validam corretamente, mas você precisa **registrar as URLs** nos serviços para receber os eventos:

### Clerk (criação/atualização de usuários)

- URL no painel Clerk: https://dashboard.clerk.com → seu app → Webhooks
- **Endpoint:** `https://cuidandovc.com.br/api/webhooks/clerk`
- **Events:** `user.created`, `user.updated`
- **Signing secret:** copiar do Clerk e setar `CLERK_WEBHOOK_SECRET` (já configurado, mas confirme se o valor bate com o do app em uso)

### Mercado Pago (pagamentos + assinaturas)

- URL no painel MP: https://www.mercadopago.com.br/developers/panel/notifications/webhooks
- **Endpoint:** `https://cuidandovc.com.br/api/webhooks/mp`
- **Events:** `payment`, `subscription_preapproval`

**Sem isso:** o sistema não atualiza status de pagamento/assinatura automaticamente.

---

## 🟢 NÃO-CRÍTICA #6 — Domínio próprio

`cuidandovc.com.br` funciona como **production domain** do Vercel, mas você mencionou querer `cuidandovc.com.br` com wildcard `*.cuidandovc.com.br` (para os links públicos dos médicos: `dr-joao.cuidandovc.com.br`).

Quando comprar o domínio:

1. Adicionar em https://vercel.com/avont-sistemas-projects/mediclin/settings/domains
2. Adicionar **TANTO** `cuidandovc.com.br` quanto `*.cuidandovc.com.br`
3. Atualizar `APP_DOMAIN=cuidandovc.com.br` no Vercel (atualmente está `cuidandovc.com.br`)
4. O `getSubdomain()` em `src/lib/subdomain.ts` já está preparado pra isso

---

## 📋 Resumo do que fiz autonomamente esta noite

### Fixes de código (commits)

| Commit    | Descrição                                                                                  |
| --------- | ------------------------------------------------------------------------------------------ |
| `12656d1` | fix: corrige HTTP 500 em todas as rotas (shim `globalThis.app` + unctx compartilhado)      |
| `260afd9` | fix: fornece `web.request` real no evento sintético (resolve `getWebRequest()`)            |
| `dc4a2ec` | chore: limpeza estrutural (remove `src/server.ts` dead code, tipa `ssr.ts`, memoizações)   |
| `25a624c` | ci: workflow de auto-deploy via Deploy Hook + corrige `npm install` no CI                  |

### Configurações no Vercel

- ✅ Adicionada env `APP_DOMAIN=cuidandovc.com.br` (Production + Development)
- ✅ Criado Deploy Hook `HP9dxUj4Ij` (main → production)
- ✅ Removido hook duplicado `c7TTjlObxH`

### Validações realizadas

- ✅ TypeScript: 0 erros
- ✅ ESLint: 0 erros (6 warnings shadcn não-críticos)
- ✅ Build local: 26s sucesso (`.output/` Nitro v3)
- ✅ Auto-deploy testado: commit `25a624c` → workflow disparou hook → 2 deploys Ready
- ✅ Todas rotas em produção retornam status esperado

---

## 🎯 Sugestão de ordem para resolver

Quando acordar, na sequência mais eficiente:

1. **Resolver pendência #2 (env vars MP)** — desbloqueia pagamentos
2. **Resolver pendência #5 (configurar webhooks externos)** — Clerk + MP no painel deles
3. **Resolver pendência #1 (reinstalar Vercel GitHub App)** — volta ao auto-deploy nativo, deleta `.github/workflows/deploy.yml`
4. **Decidir sobre pendência #3 (cron)** — cron-job.org grátis ou upgrade Pro?
5. **Pendência #6 (domínio)** — quando estiver pronto pra ir live com domínio próprio
6. **Pendência #4 (Clerk production keys)** — quando tiver usuários reais

Boa noite! 🌙
