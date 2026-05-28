# PROJECT CONTEXT

> Contexto imutável. Não atualizar sem discussão explícita.

---

## ⚠️ ARQUITETURA — LEIA ANTES DE QUALQUER COISA

### CuidandoVC é UM ecossistema com 3 níveis

```
[1] DASHBOARD DO MÉDICO  →  [DB]  →  [2] PÁGINA PÚBLICA DO MÉDICO
        (backoffice)                         (frontend do paciente)
             ↑                                         ↓
             └──────── [3] ADMIN MASTER (futuro) ──────┘
```

**Analogia obrigatória:**
- Shopify Admin → Loja pública
- Calendly Admin → Página de agendamento
- Linktree Admin → Linktree público

**O CuidandoVC funciona EXATAMENTE assim.**

---

## Nível 1 — Dashboard do Médico (backoffice)

**URL:** `mediclin.vercel.app/onboarding` (e demais rotas autenticadas)
**Usuário:** Médico/dentista/psicólogo (cliente direto do SaaS)
**Função:** CMS + CRM + Agenda médica

O médico gerencia:
- Serviços (nome, preço, duração)
- Disponibilidade (dias, horários, bloqueios)
- Identidade visual (cores, foto, bio)
- Agendamentos (confirmar, cancelar)
- Pagamentos e planos
- Telemedicina, WhatsApp
- Especialidades e configurações

**Regra:** Tudo que o médico configura aqui reflete AUTOMATICAMENTE na página pública.

---

## Nível 2 — Página Pública do Médico (frontend do paciente)

**URL:** `mediclin.vercel.app/[slug-do-medico]`
**Usuário:** Paciente (cliente do médico)
**Função:** Link na bio do Instagram/WhatsApp do médico

**NÃO É:**
- ❌ A home do CuidandoVC
- ❌ Uma landing page genérica
- ❌ Uma página separada do sistema
- ❌ Dados hardcoded

**É:**
- ✅ O "link na bio" personalizado do médico
- ✅ Dinâmica — consome 100% das configurações do médico
- ✅ Ligada diretamente ao dashboard

**Fluxo do paciente:**
```
Instagram do médico → Link na bio → mediclin.vercel.app/dr-felipe
→ Vê foto, bio, especialidade, serviços, preços, disponibilidade
→ Escolhe serviço + horário → Paga → Consulta confirmada
```

**O que o paciente vê:**
- Foto e bio do médico
- Serviços disponíveis (vindos do dashboard)
- Preços e duração (vindos do dashboard)
- Horários disponíveis (vindos da configuração de disponibilidade)
- Opções presencial/online (vindas do dashboard)
- Fluxo de pagamento

---

## Fluxo de dados obrigatório

```
Doctor Dashboard → Database → Public Doctor Page → Patient Booking → Payment → Appointment → Doctor Dashboard
```

**Exemplos de sincronização:**

| Médico faz no dashboard | Resultado imediato na página pública |
|------------------------|--------------------------------------|
| Cria serviço "Consulta Cardiológica R$250 45min" | Aparece para pacientes |
| Muda cor da marca para azul | Página pública muda |
| Remove um serviço | Desaparece da página |
| Desativa telemedicina | Opção some para o paciente |
| Bloqueia sexta-feira | Paciente não consegue agendar |

---

## Nível 3 — Admin Master (FUTURO, baixa prioridade)

Painel interno do dono do CuidandoVC (eu).
- Gerenciar médicos, planos, assinaturas, métricas, suporte
- **Não misturar com o dashboard do médico**
- **Não implementar agora**

---

## Stack
- **Framework:** TanStack Start v1.168 + Vite 7 + Nitro v3
- **Hosting:** Vercel (nitro-nightly preset)
- **DB:** Neon Postgres + Drizzle ORM
- **Auth:** Clerk (@clerk/tanstack-start v0.11.5) — apenas médicos se autenticam
- **Pagamentos:** Mercado Pago SDK v3 (split automático)
- **Email:** Resend
- **Estilo:** Tailwind CSS v4 + shadcn/ui
- **Runtime:** Node.js (NÃO Edge — Drizzle + Clerk não funcionam em Edge)

## Multi-tenancy

Toda query ao banco DEVE filtrar por `professional_id`.
O `slug` do médico na URL pública NÃO autentica — é só roteamento.
Autorização sempre vem do Clerk session (dashboard) ou lookup por slug (página pública).

## Arquivos críticos
- `src/ssr.ts` — SSR entry + shim Vinxi + Clerk handler
- `vite.config.ts` — Nitro v3 + cloudflare: false
- `src/start.ts` — middleware
- `src/db/schema.ts` — schema Drizzle (fonte da verdade)

## Pendências do usuário (ação manual)
1. Reinstalar Vercel GitHub App
2. Limpar env vars fantasmas no Vercel
3. Adicionar env vars: MP, Resend, Twilio, CRON_SECRET
