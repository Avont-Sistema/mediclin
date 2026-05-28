# 🚀 CuidandoVC — Guia de Setup

Siga os passos abaixo para colocar o CuidandoVC em produção no Vercel.

---

## 1️⃣ Variáveis de Ambiente no Vercel

Acesse o [Vercel Dashboard](https://vercel.com/avont-sistema/mediclin) → **Settings** → **Environment Variables** e adicione:

### 🗄️ Database
```
DATABASE_URL = postgresql://...
```
👉 Obtenha em [Neon Console](https://console.neon.tech/)

---

### 🔐 Clerk Authentication
```
CLERK_SECRET_KEY = sk_test_...
VITE_CLERK_PUBLISHABLE_KEY = pk_test_...
CLERK_WEBHOOK_SECRET = whsec_1bcPL+AdvXUPxsED1zdO2rjiOoM1Smb
```

**Onde encontrar:**
- `CLERK_SECRET_KEY`: [Clerk Dashboard](https://dashboard.clerk.com) → **API Keys**
- `VITE_CLERK_PUBLISHABLE_KEY`: [Clerk Dashboard](https://dashboard.clerk.com) → **API Keys**
- `CLERK_WEBHOOK_SECRET`: [Clerk Dashboard](https://dashboard.clerk.com) → **Webhooks** → (seu webhook) → Copy Signing Secret

**Configurar webhook em Clerk:**
1. Vá para **Webhooks**
2. Clique **+ Create**
3. Endpoint URL: `https://mediclin.vercel.app/api/webhooks/clerk`
4. Selecione eventos:
   - ✅ `user.created`
   - ✅ `user.updated`
5. Salve e copie o `whsec_...`

---

### 💳 Mercado Pago

```
MERCADOPAGO_ACCESS_TOKEN = APP_...
MERCADOPAGO_APP_ID = seu_app_id
MERCADOPAGO_APP_SECRET = seu_app_secret
MP_PLAN_ID_PRO = seu_plano_pro_id
MP_PLAN_ID_CLINIC = seu_plano_clinic_id
```

**Onde encontrar:**
- [Mercado Pago Developers](https://www.mercadopago.com/developers/pt-BR)
- Criar app Marketplace
- Copiar credenciais (APP_ID, APP_SECRET, access token)

**Criar planos:**
1. No painel do Mercado Pago
2. Criar **Preapproval Plan**:
   - **Pro**: R$79/mês → copiar ID
   - **Clinic**: R$199/mês → copiar ID

**Webhook MP:**
1. No painel → **Webhooks**
2. URL: `https://mediclin.vercel.app/api/webhooks/mp`
3. Eventos: `payment`, `subscription_preapproval`

---

### 📧 Email (Resend)

```
RESEND_API_KEY = re_...
```

👉 Obtenha em [Resend Dashboard](https://resend.com/api-keys)

**Verificar domínio:**
1. No Resend → **Domains**
2. Adicionar `mediclin.com.br`
3. Seguir instruções SPF/DKIM/DMARC

---

### 💬 WhatsApp (Twilio)

```
TWILIO_ACCOUNT_SID = AC...
TWILIO_AUTH_TOKEN = ...
TWILIO_WHATSAPP_FROM = whatsapp:+55XXXXXXXXXXXX  # seu número aprovado
```

👉 Obtenha em [Twilio Console](https://console.twilio.com/)

**Nota:** Usando sandbox (`whatsapp:+14155238886`) por enquanto. Para produção, precisar de número de celular aprovado.

---

### ⚙️ Configuração Geral

```
APP_DOMAIN = mediclin.app
CRON_SECRET = [gerado automaticamente pelo Vercel]
```

---

## 2️⃣ Aplicar Migrations no Banco

Execute localmente ou via Vercel CLI:

```bash
node --import tsx/esm src/db/apply-migration.ts
```

Isso cria as tabelas no Neon (users, professionals, services, appointments, etc.)

---

## 3️⃣ Configurar Domínio no Vercel

1. Vá para [Vercel Domains](https://vercel.com/avont-sistema/mediclin/domains)
2. Clique **Add Domain**
3. Digite `mediclin.app`
4. Configure DNS (adicionar registros A/CNAME conforme Vercel instruir)

**Para subdomínios:**
1. Vá para **Domains** → Clicar no domínio
2. Clique **Add Subdomain**
3. Padrão: `*.mediclin.app` → wildcard para `dr-nome.mediclin.app`

---

## 4️⃣ Testar Fluxo Completo

### 🧪 Teste de Autenticação
1. Acesse `https://mediclin.vercel.app`
2. Clique **Sign Up**
3. Crie conta → Verifica se webhook Clerk foi chamado (novo usuário na DB)

### 🧪 Teste de Agendamento
1. Clique em **Sign In**
2. Acesse `/onboarding`
3. Crie profissional com slug (ex: `dr-joao`)
4. Vá para dashboard → Configurações
5. Crie um serviço
6. Acesse `https://mediclin.vercel.app/dr-joao`
7. Tente agendar → deve levar ao Mercado Pago (sandbox)

### 🧪 Teste de E-mail
1. Após agendamento bem-sucedido
2. Verifica se e-mail de confirmação chegou
3. Verifica se e-mail ao profissional foi enviado

---

## 📋 Checklist de Deploy

- [ ] Variáveis de ambiente adicionadas no Vercel
- [ ] Clerk webhook configurado e testado
- [ ] Mercado Pago webhook configurado
- [ ] Migrations aplicadas (`DATABASE_URL` válida)
- [ ] Resend domínio verificado
- [ ] Twilio credenciais válidas
- [ ] Domínio principal `mediclin.app` apontando para Vercel
- [ ] Wildcard `*.mediclin.app` configurado (subdomínios)
- [ ] Teste de sign up → novo usuário criado
- [ ] Teste de onboarding → profissional criado
- [ ] Teste de agendamento → e-mails enviados

---

## 🚨 Troubleshooting

### "CLERK_WEBHOOK_SECRET não configurado"
→ Adicionar env var no Vercel (Settings → Environment Variables)

### "DATABASE_URL não é válido"
→ Verificar se Neon está acessível; copiar URL completa do console Neon

### "Pagamento falha no Mercado Pago"
→ Verificar se `MP_PLAN_ID_PRO` existe na conta MP
→ Usar modo sandbox durante testes

### "E-mail não chega"
→ Verificar `RESEND_API_KEY` válida
→ Domínio `mediclin.com.br` verificado no Resend

---

**✅ Pronto! CuidandoVC está em produção!**

Acesse: **https://mediclin.vercel.app**
