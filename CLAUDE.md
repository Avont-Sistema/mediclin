# CLAUDE.md — Guia do projeto CuidandoVC

## ⚠️ ARQUITETURA DO PRODUTO (regra definitiva)

CuidandoVC é **um ecossistema**, não apps separados:

```
Dashboard do Médico (backoffice)  →  DB  →  Página Pública /:slug (paciente)
```

- **`/dashboard`, `/agenda`, `/settings`** = painel do médico (Shopify Admin)
- **`/:slug`** = link na bio do médico no Instagram (Shopify Store) — dinâmica, sem dados hardcoded
- Tudo que o médico configura no dashboard reflete automaticamente na página pública
- Fluxo obrigatório: `Dashboard → DB → Página Pública → Agendamento → Pagamento → Consulta → Dashboard`

**Nunca trate a `/:slug` como home do site ou página independente.**

---

## REGRAS DE CONTEXTO (seguir SEMPRE)

1. **Nova sessão**: ler `.claude/SESSION_RESUME.md` PRIMEIRO, depois `.claude/CURRENT_STATE.md`
2. **Antes de codar**: `git log --oneline -5` para ver estado atual
3. **Nunca** reler o projeto inteiro — analisar apenas arquivos relevantes à tarefa
4. **Ao encerrar**: atualizar `.claude/SESSION_RESUME.md` + `.claude/HANDOFF.md`
5. **Múltiplos PCs**: sempre verificar `git log` antes de assumir estado do projeto

---

Siga as convenções abaixo sem exceção.

---

## Visão do produto

**CuidandoVC** é um SaaS multi-tenant para médicos, dentistas e outros profissionais de saúde.
Inspirado no modelo do Anota.ai, mas voltado para saúde: cada profissional recebe um **link público** (ex: `dr-ricardo.cuidandovc.com.br`) que pode colocar na bio do Instagram. Pacientes acessam esse link, escolhem serviço, horário e **pagam na hora** — sem sair do app.

---

## Modelo de negócio

| Fluxo                      | Descrição                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| **Receita 1 — Assinatura** | Doutor paga mensalidade ao CuidandoVC (Free / Pro / Clinic)                                     |
| **Receita 2 — Split**      | CuidandoVC retém taxa de plataforma (≈ 5%) em cada pagamento paciente→doutor via Stripe Connect |

O dinheiro do paciente **nunca passa pela conta do CuidandoVC** — vai direto para a conta Stripe Connect do doutor, descontando a taxa automaticamente (`application_fee_amount`).

---

## Personas

### 🩺 Dr. João (profissional)

- Clínico geral, atende em consultório próprio
- Usa Instagram para captar pacientes, quer substituir o WhatsApp para agendamento
- Não quer lidar com links de pagamento manuais

### 🦷 Dra. Ana (profissional)

- Dentista em clínica compartilhada
- Quer receber pagamentos online mas odeia taxas altas
- Precisa de agenda integrada que evite conflitos

### 👤 Paciente

- Chega via link da bio do Instagram
- Quer agendar em menos de 2 minutos, pagar pelo celular
- Não quer criar conta — usa OTP ou social login

---

## Stack e decisões arquiteturais

| Camada         | Tecnologia                          | Motivo                                           |
| -------------- | ----------------------------------- | ------------------------------------------------ |
| Framework      | TanStack Start + Vite               | Já no projeto; SSR nativo, sem Next.js lock-in   |
| Hosting        | Vercel (Fluid Compute)              | CI/CD integrado, Marketplace provisiona env vars |
| Banco de dados | Neon Postgres (Vercel Marketplace)  | Serverless Postgres, branching por PR            |
| ORM            | Drizzle ORM                         | Type-safe, sem magia, migrations explícitas      |
| Auth           | Clerk (Vercel Marketplace)          | Multi-tenant pronto, webhooks confiáveis         |
| Pagamentos     | Stripe Connect (Vercel Marketplace) | Split nativo, onboarding Express, webhooks       |
| Email          | Resend (Vercel Marketplace)         | API simples, templates React                     |
| WhatsApp/SMS   | Twilio                              | Lembretes 2h antes                               |
| Estilo         | Tailwind CSS v4 + shadcn/ui         | Já no projeto                                    |
| Validação      | Zod                                 | Compartilhado entre cliente e servidor           |

### Decisões fixas (não rever sem discussão)

- **Runtime: Node.js** — não usar Edge Functions (Drizzle + Neon não funcionam bem em Edge)
- **Sem Cloudflare Workers** — projeto está migrando para Vercel nativo
- **Tenant isolado por `professional_id`** — cada query DEVE filtrar pelo profissional autenticado
- **Stripe Connect Express** — onboarding simplificado para o doutor, split automático
- **Sem ORM mágico** — toda query deve ser explícita, sem `findOne` implícito que vaze dados entre tenants

---

## Estrutura de pastas

```
src/
  routes/          # Páginas e API routes (TanStack Start file-based routing)
    api/           # Endpoints de API (webhooks, server functions)
    (auth)/        # Grupo de rotas autenticadas
    (public)/      # Rotas públicas (página do doutor, agendamento)
  components/      # Componentes React reutilizáveis
    ui/            # Componentes base (shadcn)
  lib/             # Lógica de negócio, helpers, formatters
  db/              # Schema Drizzle, migrations, seed
    schema.ts      # Definição das tabelas
    index.ts       # Instância do cliente Drizzle
  server/          # Funções exclusivas do servidor (sem acesso no cliente)
  hooks/           # React hooks customizados
  assets/          # Imagens e arquivos estáticos
```

### Regras de organização

- **Componentes SEMPRE em `src/components`** — nunca inline em rotas
- **Lógica de negócio em `src/lib` ou `src/server`** — rotas só orquestram
- **Queries ao banco SEMPRE em `src/server`** — nunca direto em componentes cliente
- **Tipos compartilhados em `src/lib/types.ts`**

---

## Convenções de código

### Nomenclatura

| Tipo                   | Convenção         | Exemplo                               |
| ---------------------- | ----------------- | ------------------------------------- |
| Arquivos de componente | PascalCase        | `BookingWizard.tsx`                   |
| Arquivos de rota       | kebab-case        | `booking-confirmation.tsx`            |
| Arquivos de lib/util   | kebab-case        | `format-currency.ts`                  |
| Variáveis/funções      | camelCase         | `professionalId`, `getAvailableSlots` |
| Constantes globais     | UPPER_SNAKE       | `MAX_BOOKING_DAYS_AHEAD`              |
| Tabelas Drizzle        | snake_case        | `availability_rules`                  |
| Enums de status        | snake_case string | `"aguardando_pagamento"`              |

### Commits (em português)

```
feat: adiciona wizard de agendamento
fix: corrige cálculo de slots disponíveis
refactor: extrai lógica de split para lib/stripe
chore: atualiza dependências
docs: documenta variáveis de ambiente
test: adiciona testes de unidade para availability
```

### TypeScript

- `strict: true` — sem `any`, sem `as unknown as X` sem comentário justificando
- Prefira `type` a `interface` para objetos de dados
- Prefira `interface` para contratos (props de componente, retorno de API)
- Exporte tipos junto ao arquivo que os define

---

## Variáveis de ambiente

Nunca hardcode. Sempre use `vercel env pull` para sincronizar localmente.

| Variável                            | Descrição                                            |
| ----------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`                      | Neon Postgres (provisionado pelo Vercel Marketplace) |
| `CLERK_SECRET_KEY`                  | Clerk backend (provisionado pelo Vercel Marketplace) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend                                       |
| `STRIPE_SECRET_KEY`                 | Stripe (provisionado pelo Vercel Marketplace)        |
| `STRIPE_WEBHOOK_SECRET`             | Secret do webhook Stripe                             |
| `RESEND_API_KEY`                    | Resend (provisionado pelo Vercel Marketplace)        |
| `TWILIO_ACCOUNT_SID`                | Twilio                                               |
| `TWILIO_AUTH_TOKEN`                 | Twilio                                               |

---

## O que NÃO fazer

- ❌ **Não usar Edge Runtime** — quebra Drizzle, Clerk SDK e Node APIs
- ❌ **Não criar componentes fora de `src/components`**
- ❌ **Não colocar lógica de banco em componentes cliente**
- ❌ **Não commitar `.env`, `.env.local` ou qualquer arquivo com segredos**
- ❌ **Não usar dados mock em código de produção** — use `src/db/seed.ts` para seeds
- ❌ **Não fazer query sem filtrar por `professional_id`** — vazamento de dados entre tenants
- ❌ **Não pular migrations** — toda mudança de schema passa por `drizzle-kit generate`
- ❌ **Não fazer deploy direto na `main`** — sempre via PR com CI verde
- ❌ **Não criar rotas de API sem validação Zod** no input
- ❌ **Não usar `console.log` em produção** — use um logger estruturado

---

## Fluxo de branches

```
main                    ← produção (protegida, deploy automático no Vercel)
  └── feature/fase-N-descricao   ← branch por fase
        └── fix/bug-especifico   ← hotfix dentro da fase
```

Nunca force-push em `main`. Sempre abra PR com CI verde antes de mergear.

---

## Multi-tenancy — regra de ouro

Toda query que acessa dados de um profissional DEVE:

1. Obter o `professionalId` do contexto autenticado (Clerk session)
2. Incluir `.where(eq(table.professionalId, professionalId))` explicitamente
3. Nunca confiar em parâmetros de URL para autorização

---

## Checklist antes de cada commit

- [ ] `npm run lint` passou sem erros
- [ ] `npm run typecheck` passou sem erros
- [ ] Nenhum `console.log` novo
- [ ] Nenhum segredo hardcoded
- [ ] Toda nova query filtra por tenant
- [ ] Componentes novos estão em `src/components`
