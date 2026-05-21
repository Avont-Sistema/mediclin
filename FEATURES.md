# 🏥 MediClin — Funcionalidades Completas

## 📊 Resumo Executivo

**MediClin** é um SaaS multi-tenant para médicos, dentistas e profissionais de saúde. Cada profissional recebe um link público (ex: `dr-ricardo.mediclin.app`) para compartilhar na bio do Instagram. Pacientes agendam e pagam sem sair do app.

---

## 🌐 Para o Paciente

### 1️⃣ Landing Page Pública
- Exibe especialidades disponíveis
- Lista de profissionais com rating
- Wizard de agendamento interativo
- Integração com Mercado Pago (PIX, cartão)
- Sem necessidade de criar conta

**URL:** `https://mediclin.vercel.app`

---

### 2️⃣ Página do Profissional
- Link compartilhável: `https://dr-nome.mediclin.app` (ou `/dr-nome`)
- Perfil com foto, especialidade, registro (CRM/CRO)
- Lista de serviços com preço e duração
- Link WhatsApp para contato direto
- Carousel de disponibilidade em tempo real

**Exemplo:** `https://mediclin.vercel.app/dr-joao`

---

### 3️⃣ Wizard de Agendamento
**Fluxo:**
1. Escolher especialidade
2. Selecionar serviço (com preço)
3. Escolher profissional
4. Selecionar data e horário (calendário)
5. Preencher nome e WhatsApp
6. Confirmar no Mercado Pago

**Resultado:**
- ✅ Agendamento confirmado
- 📧 E-mail de confirmação ao paciente
- 📧 E-mail de notificação ao profissional
- 🔔 Lembrete 2h antes (e-mail + WhatsApp pro/clinic)

---

## 👨‍⚕️ Para o Profissional

### 1️⃣ Dashboard Completo
**Visão Geral:**
- KPIs: receita do mês, agendamentos, taxa de conversão
- Próximos atendimentos hoje
- Botões de ação rápida

**Agenda:**
- Visualização semanal
- Navegação por semanas
- Marcar como: Concluído, No-show, Cancelado
- Expandir para ver detalhes do paciente

**Pacientes:**
- Lista de todos os pacientes
- Busca por nome/email/telefone
- Stats: total consultas, receita, ticket médio
- Contato direto (WhatsApp, telefone, email)

**Configurações:**
- Editar perfil (nome, especialidade, registro, foto, bio)
- Gerenciar serviços (criar, editar, ativar/desativar)
- Definir disponibilidade por dia/horário
- Ver link público do perfil

**Financeiro:** (em breve)

---

### 2️⃣ Onboarding Wizard
**Para novo profissional:**
1. **Passo 1:** Preencher nome, especialidade, registro
2. **Passo 2:** Escolher slug com preview da URL (`dr-seu-nome.mediclin.app`)
3. **Passo 3:** Confirmar dados → profissional criado
4. Redirecionado ao dashboard para começar

---

### 3️⃣ Gestão de Serviços
- Nome do serviço
- Descrição (opcional)
- Duração (minutos)
- Preço
- Toggle ativar/desativar
- Pode criar múltiplos serviços

**Exemplo:**
```
Consulta Geral | 30 min | R$ 150 | ✓ ativo
Retorno       | 20 min | R$ 100 | ✓ ativo
Telemedicina  | 30 min | R$  80 | ✗ inativo
```

---

### 4️⃣ Regras de Disponibilidade
Define quando está disponível:
- Domingo: desabilitado
- Segunda a Sexta: 08:00 - 18:00 (almoço 12:00-13:00)
- Sábado: 08:00 - 13:00

O sistema bloqueia horários conflitantes automaticamente.

---

## 💳 Pagamentos

### Modelo de Negócio
| Fluxo | Descrição |
|-------|-----------|
| **Paciente paga** | Mercado Pago (PIX, cartão) |
| **Dinheiro vai para** | Conta Mercado Pago do profissional |
| **Plataforma retém** | ~5% taxa (automática) |
| **Profissional recebe** | 95% líquido na conta dele |

### Planos de Assinatura
| Plano | Preço | Benefícios |
|-------|-------|-----------|
| **Free** | Grátis | Dashboard básico, até 10 agendamentos/mês |
| **Pro** | R$79/mês | E-mails ilimitados, WhatsApp lembrete |
| **Clinic** | R$199/mês | Tudo Pro + múltiplos profissionais |

---

## 📧 Notificações

### Para Paciente
✅ **Confirmação** - Após pagamento aprovado  
✅ **Lembrete** - 2h antes do atendimento

### Para Profissional
✅ **Novo Agendamento** - Assim que paciente paga  
✅ **Lembrete** - 2h antes (planos Pro/Clinic)

### Via Canais
📧 **E-mail** - Resend (todos os planos)  
📱 **WhatsApp** - Twilio (Pro/Clinic apenas)

---

## 🔐 Autenticação

### Clerk (Social + Email)
- Sign in com e-mail/senha
- Sign up novo usuário
- Single sign-on (Google, GitHub opcional)
- Webhook automático: novo usuário criado na DB

---

## 📱 Design & UX

### Responsivo
- ✅ Desktop: sidebar fixo, layout wide
- ✅ Tablet: adapta grid e componentes
- ✅ Mobile: hamburger menu, drawer deslizante

### Tema
- Cores: Teal (primary), Indigo (secondary), Slate (neutral)
- Tipografia: Instrumnet Sans (customizada)
- Shadows e borders: design system moderno
- Dark mode: preparado (CSS variables)

---

## 🔗 Integração Terceiros

| Serviço | Função | Status |
|---------|--------|--------|
| **Clerk** | Autenticação | ✅ Ativo |
| **Neon Postgres** | Database | ✅ Ativo |
| **Mercado Pago** | Pagamentos | ✅ Ativo |
| **Resend** | E-mails | ✅ Ativo |
| **Twilio** | WhatsApp | ✅ Ativo |
| **Vercel** | Hosting + CI/CD | ✅ Ativo |

---

## 📊 Database

### Tabelas Principais
```
users (ID, clerkId, email, nome)
professionals (ID, userId, slug, nome, especialidade, registro, foto, bio, plano)
services (ID, professionalId, nome, descricao, preco, duracao)
appointments (ID, professionalId, serviceId, patientId, inicio, status, valorPago)
availabilityRules (ID, professionalId, diaSemana, horaInicio, horaFim)
subscriptions (ID, professionalId, plano, mpSubscriptionId, status)
payments (ID, appointmentId, professionalId, mpPaymentId, valorBruto, taxaPlataforma)
```

**Multi-tenant:** Todos os dados filtrados por `professionalId` (isolamento garantido)

---

## 🚀 Deployment

### Produção
- **Hosting:** Vercel (Node.js Runtime)
- **Database:** Neon Postgres (Vercel Marketplace)
- **Domínio:** `mediclin.app` + wildcard `*.mediclin.app`
- **CI/CD:** GitHub Actions (Lint, Typecheck, Build)
- **URL:** https://mediclin.vercel.app

### Cron Jobs
- **Reminders:** A cada hora (`0 * * * *`)
  - Encontra agendamentos 2h à frente
  - Envia e-mail + WhatsApp (se Pro/Clinic)
  - Marca como lembrete enviado

---

## 📈 Métricas & Analytics

### Para Profissional
- Receita mensal
- Total de agendamentos
- Taxa de conversão (visitantes → agendados)
- Pacientes recorrentes
- Serviço mais popular

### Para Admin (futura)
- Total de profissionais cadastrados
- Receita total plataforma
- Agendamentos por especialidade
- Taxa de retenção

---

## 🔮 Roadmap Futuro

### Fase 11 - Reports & Analytics
- Gráficos de receita/agendamentos
- Exportar relatórios (PDF/CSV)
- Dashboard admin

### Fase 12 - Marketplace
- Listar profissionais por especialidade
- Descoberta de médicos
- Reviews & ratings do paciente

### Fase 13 - Integrações
- Google Calendar sincronização
- Zoom para teleconsulta
- Stripe Connect (alternativa)

### Fase 14 - Mobile App
- iOS + Android
- Push notifications
- Agenda offline

---

## ✅ Status Atual

| Item | Status | Observação |
|------|--------|-----------|
| Landing page | ✅ Pronto | Funcionando |
| Auth Clerk | ✅ Pronto | Webhook configurável |
| Página profissional | ✅ Pronto | Subdomínio + path-based |
| Wizard agendamento | ✅ Pronto | Integrado com Mercado Pago |
| Dashboard | ✅ Pronto | 5 abas completas |
| Notificações | ✅ Pronto | E-mail + WhatsApp |
| Planos assinatura | ✅ Pronto | Free/Pro/Clinic |
| Mobile nav | ✅ Pronto | Drawer deslizante |
| Produção Vercel | ✅ Pronto | https://mediclin.vercel.app |

---

**🎉 MediClin é um produto completo, escalável e pronto para uso!**
