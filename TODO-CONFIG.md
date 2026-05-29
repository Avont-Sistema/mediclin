# ✅ TODO — Configuração Final do CuidandoVC

## 🎯 Ações Imediatas (Próximas 24h)

### 1. Adicionar Clerk Webhook Secret no Vercel

**Com o webhook secret que você me passou:**
```
CLERK_WEBHOOK_SECRET = whsec_1bcPL+AdvXUPxsED1zdO2rjiOoM1Smb
```

**Passos:**
1. Acesse https://vercel.com/avont-sistema/mediclin
2. Clique em **Settings**
3. Vá para **Environment Variables**
4. Clique **Add New**
5. Nome: `CLERK_WEBHOOK_SECRET`
6. Valor: `whsec_1bcPL+AdvXUPxsED1zdO2rjiOoM1Smb`
7. Selecione `Production` (e `Preview` se quiser testar)
8. Clique **Save**
9. O deploy automático vai rodar (espere ~5 min)

---

### 2. Adicionar Outras Variáveis Críticas

**Database (Neon):**
```
DATABASE_URL = postgresql://user:pass@host/db
```
👉 Obter em [https://console.neon.tech](https://console.neon.tech)

**Clerk (restante):**
```
CLERK_SECRET_KEY = sk_test_...
VITE_CLERK_PUBLISHABLE_KEY = pk_test_...
```
👉 Obter em [https://dashboard.clerk.com/apps](https://dashboard.clerk.com/apps)

**Mercado Pago (básico):**
```
MERCADOPAGO_ACCESS_TOKEN = APP_...
```
👉 Obter em [https://www.mercadopago.com/developers](https://www.mercadopago.com/developers)

**Email (Resend):**
```
RESEND_API_KEY = re_...
```
👉 Obter em [https://resend.com/api-keys](https://resend.com/api-keys)

**App Domain:**
```
APP_DOMAIN = cuidandovc.com.br
```

---

### 3. Configurar Webhook no Clerk

**URL:**
```
https://cuidandovc.com.br/api/webhooks/clerk
```

**Passos:**
1. Acesse [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Procure por **Webhooks**
3. Clique **Create**
4. Cole a URL acima
5. Selecione eventos:
   - ✅ `user.created`
   - ✅ `user.updated`
6. Clique **Create** e copie o `whsec_...` (já você tem esse!)

---

### 4. Testar Webhook Clerk

**Sign Up Test:**
1. Acesse https://cuidandovc.com.br
2. Clique **Sign Up**
3. Crie uma conta de teste
4. Verifique se o usuário foi criado no banco:
   ```bash
   # Conectar ao Neon
   psql $DATABASE_URL
   SELECT * FROM users ORDER BY criado_em DESC LIMIT 1;
   ```

**Resultado esperado:**
- Novo usuário aparece na tabela `users`
- `clerkId`, `email`, `nome` preenchidos

---

### 5. Aplicar Migrations no Banco

**Executar locally (com DATABASE_URL configurada):**
```bash
node --import tsx/esm src/db/apply-migration.ts
```

**Ou via Vercel CLI (futura):**
```bash
vercel env pull
node --import tsx/esm src/db/apply-migration.ts
```

**Resultado esperado:**
- Tabelas criadas: users, professionals, services, appointments, etc.
- Sem erros de SQL

---

## 📋 Configurações Secundárias (Próximos 2-3 dias)

### 6. Mercado Pago Setup Completo

**Onde:**
1. https://www.mercadopago.com.br
2. Dashboard → **Configurações**
3. Copiar: `Access Token`, `APP_ID`, `APP_SECRET`

**Variáveis Vercel:**
```
MERCADOPAGO_ACCESS_TOKEN = APP_...
MERCADOPAGO_APP_ID = ...
MERCADOPAGO_APP_SECRET = ...
```

**Criar Planos:**
1. Dashboard MP → **Preapproval Plans**
2. Criar plano Pro (R$79/mês) → copiar ID
3. Criar plano Clinic (R$199/mês) → copiar ID

**Variáveis:**
```
MP_PLAN_ID_PRO = seu_plano_id
MP_PLAN_ID_CLINIC = outro_plano_id
```

**Webhook MP:**
1. Dashboard → **Webhooks**
2. URL: `https://cuidandovc.com.br/api/webhooks/mp`
3. Eventos: `payment`, `subscription_preapproval`

---

### 7. Email (Resend)

**Obter API Key:**
1. https://resend.com/api-keys
2. Copiar key

**Variável:**
```
RESEND_API_KEY = re_...
```

**Verificar Domínio (importante!):**
1. Resend → **Domains**
2. Clique **Add Domain**
3. Digite `cuidandovc.com.br`
4. Verá instruções SPF/DKIM/DMARC
5. Adicionar registros no DNS do domínio
6. Aguardar verificação (~30 min)

---

### 8. WhatsApp (Twilio) — Opcional (Pro/Clinic)

**Obter Credenciais:**
1. https://console.twilio.com
2. Copiar: Account SID, Auth Token

**Variáveis:**
```
TWILIO_ACCOUNT_SID = AC...
TWILIO_AUTH_TOKEN = ...
```

**Para Produção (opcional agora):**
- Precisar de número aprovado: `TWILIO_WHATSAPP_FROM = whatsapp:+55XXXXXXXXXXXX`
- Por enquanto, usa sandbox: `whatsapp:+14155238886`

---

## 🌍 Domínio & DNS (Próxima semana)

### 9. Apontar `cuidandovc.com.br` para Vercel

**Em seu registrador de domínio (GoDaddy, Namecheap, etc):**
1. Vá para DNS settings
2. Remova registros antigos (se houver)
3. Adicione CNAME:
   ```
   cuidandovc.com.br → cuidandovc.com.br
   ```
4. Aguarde propagação (até 24h)

**No Vercel:**
1. Settings → **Domains**
2. Clique **Add Domain**
3. Digite `cuidandovc.com.br`
4. Seguir instruções de verificação

---

### 10. Wildcard para Subdomínios

**No Vercel (após domínio configurado):**
1. Settings → **Domains** → clique no domínio
2. Clique **Add Subdomain**
3. Digite: `*.cuidandovc.com.br`
4. Save

**Resultado:**
- `dr-joao.cuidandovc.com.br` funciona automaticamente
- `dr-maria.cuidandovc.com.br` funciona automaticamente
- etc.

---

## 🧪 Testes E2E (3-4 dias)

### Teste 1: Sign Up → Novo Profissional
```
1. Acesse cuidandovc.com.br
2. Sign Up com email
3. Confirme que usuário foi criado (verificar DB)
4. Vá para /onboarding
5. Preencha: nome, especialidade, registro, slug
6. Confirme que profissional foi criado (verificar DB)
7. Acesse /dashboard → deve funcionar
```

### Teste 2: Criar Serviço
```
1. No dashboard → Configurações
2. Clique "Novo Serviço"
3. Preencha: nome, descrição, preço, duração
4. Salve
5. Verifique na tabela services (DB)
```

### Teste 3: Agendar como Paciente (Sandbox)
```
1. Acesse /seu-slug (ex: /dr-joao)
2. Escolha especialidade, serviço, data, hora
3. Preencha nome e WhatsApp
4. Clique "Confirmar Agendamento"
5. Vai para Mercado Pago (SANDBOX)
6. Use cartão de teste: 4111111111111111 (exp: 11/25, CVV: 123)
7. Confirme pagamento
8. Verifique:
   - Agendamento criado (DB)
   - E-mail enviado ao paciente
   - E-mail enviado ao profissional
```

### Teste 4: Reminders (2h antes)
```
1. Crie agendamento com horário exato
2. Espere 1h50min (ou modificar BD manualmente para testar)
3. Acesse /api/cron/reminders manualmente (GET)
4. Verifique:
   - E-mail de lembrete enviado
   - Campo lembreteEnviadoEm atualizado (DB)
```

---

## 📞 Suporte

Se algo não funcionar:

1. **Variáveis de Ambiente:**
   - Verificar Vercel → Settings → Environment Variables
   - Testar localmente: `vercel env pull` + rodar dev

2. **Database:**
   - Verificar conexão: `psql $DATABASE_URL`
   - Verificar schema: `\dt` (listar tabelas)

3. **Webhooks:**
   - Clerk → Webhooks → clique no seu webhook → **Testing**
   - Mercado Pago → Webhooks → similar

4. **Logs:**
   - Vercel → Deployments → clicar no último
   - Ver logs de build

---

## 🎉 Checklist Final

- [ ] CLERK_WEBHOOK_SECRET adicionado no Vercel
- [ ] DATABASE_URL configurada e testada
- [ ] CLERK_SECRET_KEY + VITE_CLERK_PUBLISHABLE_KEY adicionadas
- [ ] MERCADOPAGO_ACCESS_TOKEN adicionada
- [ ] RESEND_API_KEY adicionada
- [ ] APP_DOMAIN = cuidandovc.com.br
- [ ] Migrations aplicadas (tabelas criadas)
- [ ] Webhook Clerk testado (novo usuário criado ao sign up)
- [ ] Resend domínio verificado (SPF/DKIM/DMARC)
- [ ] Domínio cuidandovc.com.br apontando para Vercel
- [ ] Wildcard *.cuidandovc.com.br configurado
- [ ] Teste de sign up ✓
- [ ] Teste de onboarding ✓
- [ ] Teste de agendamento com pagamento sandbox ✓
- [ ] Teste de e-mail ✓

---

**✅ Quando todos os itens acima estiverem feitos, o CuidandoVC estará 100% funcional em produção!**

Para dúvidas, consulte:
- 📖 [SETUP.md](./SETUP.md) — Guia passo a passo
- 📋 [FEATURES.md](./FEATURES.md) — Funcionalidades completas
- 🔧 [CLAUDE.md](./CLAUDE.md) — Arquitetura técnica
