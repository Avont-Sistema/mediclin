# MediClin

SaaS de agendamento e pagamentos para médicos e clínicas. Médicos recebem um link público personalizado (ex: `dr-ricardo.cuidandovc.com.br`) para colocar na bio do Instagram. Pacientes agendam e pagam direto pelo app — o dinheiro vai para a conta do doutor via Stripe Connect.

---

## Setup local

### Pré-requisitos

- Node.js 24+
- npm 11+
- Conta Vercel com acesso ao projeto

### 1. Clone e instale

```bash
git clone https://github.com/Avont-Sistema/mediclin.git
cd mediclin
npm install
```

### 2. Variáveis de ambiente

Nunca crie `.env` manualmente. Use o Vercel CLI para puxar as variáveis do projeto:

```bash
npm install -g vercel
vercel link          # vincula ao projeto Vercel
vercel env pull      # cria .env.local automaticamente
```

O `.env.local` está no `.gitignore` — nunca commite esse arquivo.

### 3. Banco de dados

```bash
# Rodar migrations
npx drizzle-kit migrate

# Popular com dados de seed (desenvolvimento)
npm run db:seed
```

### 4. Iniciar em desenvolvimento

```bash
npm run dev
# Acesse http://localhost:8080
```

---

## Scripts disponíveis

| Script                | Descrição                                           |
| --------------------- | --------------------------------------------------- |
| `npm run dev`         | Servidor de desenvolvimento (Vite + TanStack Start) |
| `npm run build`       | Build de produção                                   |
| `npm run preview`     | Preview do build de produção                        |
| `npm run lint`        | ESLint                                              |
| `npm run typecheck`   | TypeScript sem emissão                              |
| `npm run format`      | Prettier                                            |
| `npm run db:generate` | Gera migrations Drizzle                             |
| `npm run db:migrate`  | Aplica migrations                                   |
| `npm run db:seed`     | Popula banco com dados de desenvolvimento           |
| `npm run db:studio`   | Abre Drizzle Studio (GUI do banco)                  |

---

## Variáveis de ambiente

Todas as variáveis são provisionadas via **Vercel Marketplace**. Use `vercel env pull` para obtê-las localmente.

| Variável                     | Serviço       | Obrigatória |
| ---------------------------- | ------------- | ----------- |
| `DATABASE_URL`               | Neon Postgres | ✅          |
| `CLERK_SECRET_KEY`           | Clerk         | ✅          |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk         | ✅          |
| `STRIPE_SECRET_KEY`          | Stripe        | ✅          |
| `STRIPE_WEBHOOK_SECRET`      | Stripe        | ✅          |
| `RESEND_API_KEY`             | Resend        | ✅          |
| `TWILIO_ACCOUNT_SID`         | Twilio        | Fase 7      |
| `TWILIO_AUTH_TOKEN`          | Twilio        | Fase 7      |

---

## Fluxo de branches

```
main                         ← produção (deploy automático no Vercel)
  └── feature/fase-N-desc    ← branch por fase de desenvolvimento
        └── fix/descricao    ← correções dentro de uma fase
```

- **Nunca commite direto na `main`**
- Toda PR precisa ter CI verde (lint + typecheck + build)
- Use o template em `.github/PULL_REQUEST_TEMPLATE.md`

---

## Arquitetura

```
src/
  routes/       # Páginas e API routes (TanStack Start)
    api/        # Webhooks e server functions
  components/   # Componentes React
    ui/         # shadcn/ui
  lib/          # Lógica de negócio e helpers
  db/           # Schema Drizzle e migrations
  server/       # Funções exclusivas do servidor
  hooks/        # React hooks
```

Leia o [CLAUDE.md](./CLAUDE.md) para convenções detalhadas de código e decisões arquiteturais.

---

## Multi-tenancy

Cada médico é um tenant isolado por `professional_id`. **Toda query ao banco deve filtrar por esse campo.** Veja a seção "Multi-tenancy — regra de ouro" no CLAUDE.md.

---

## Modelo de negócio

- **Receita 1:** Assinatura mensal do médico (Free / Pro / Clinic)
- **Receita 2:** Taxa de plataforma (~5%) em cada pagamento via Stripe Connect

O split acontece automaticamente via `application_fee_amount` — o dinheiro nunca passa pela conta do MediClin.

---

## Produção

- **URL:** https://mediclin.vercel.app
- **Deploy:** automático via Vercel ao mergear na `main`
- **Logs:** Vercel Dashboard → projeto `mediclin`
