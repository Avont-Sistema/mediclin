import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planoEnum = pgEnum("plano", ["free", "pro", "clinic"]);

export const modalidadeEnum = pgEnum("modalidade_atendimento", ["presencial", "online", "ambos"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "aguardando_pagamento",
  "confirmado",
  "concluido",
  "cancelado",
  "no_show",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ativa",
  "cancelada",
  "inadimplente",
  "trial",
]);

export const diasSemanaEnum = pgEnum("dia_semana", [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
]);

export const cardTypeEnum = pgEnum("card_type", [
  "certificacao", // CRM, registro profissional
  "qualificacao", // "Especialização: Odontopediatria"
  "servico_extra", // "Laserterapia", "Ortopedia Funcional"
  "whatsapp", // valor = número, gera link wa.me automaticamente
  "instagram", // valor = @handle ou URL completa
  "localizacao", // valor = URL do Google Maps
  "telefone", // valor = telefone fixo
  "email", // valor = email
]);

// ─── users ────────────────────────────────────────────────────────────────────
// Espelho do usuário Clerk — sincronizado via webhook

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── clinics ──────────────────────────────────────────────────────────────────

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  cnpj: varchar("cnpj", { length: 18 }),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── professionals ────────────────────────────────────────────────────────────

export const professionals = pgTable(
  "professionals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // nullable: clinic-managed professionals don't have their own Clerk account
    userId: uuid("user_id")
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    clinicId: uuid("clinic_id").references(() => clinics.id, {
      onDelete: "set null",
    }),
    // Self-referential: clinic member links to clinic owner's professional
    parentProfessionalId: uuid("parent_professional_id").references(
      (): AnyPgColumn => professionals.id,
      { onDelete: "set null" },
    ),

    // Perfil público
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    nomeCompleto: varchar("nome_completo", { length: 255 }).notNull(),
    especialidade: varchar("especialidade", { length: 100 }).notNull(),
    registro: varchar("registro", { length: 30 }).notNull(), // CRM, CRO, etc.
    uf: varchar("uf", { length: 2 }), // Estado (SP, RJ, MG...)
    headline: varchar("headline", { length: 160 }), // "Cuidando a Saúde com Odontologia!"
    headlineDestaque: varchar("headline_destaque", { length: 60 }), // palavra colorida ex: "Odontologia"
    bio: text("bio"), // limitar 2 linhas no front (~200 chars)
    fotoUrl: text("foto_url"),
    telefoneWhatsapp: varchar("telefone_whatsapp", { length: 20 }),
    corPrimaria: varchar("cor_primaria", { length: 20 }).default("teal"), // teal, rose, indigo, etc.
    corDestaque: varchar("cor_destaque", { length: 20 }), // cor da palavra destacada (null = usa corPrimaria)

    // Personalização da página pública
    corMarca: varchar("cor_marca", { length: 7 }).default("#0d9488").notNull(),
    corTexto: varchar("cor_texto", { length: 7 }).default("#0f172a").notNull(),
    heroTitulo: varchar("hero_titulo", { length: 255 }),
    heroSubtitulo: text("hero_subtitulo"),
    heroImageUrl: text("hero_image_url"),
    // Atendimento Virtual (antiga "telemedicina")
    atendimentoVirtualAtivo: boolean("atendimento_virtual_ativo").default(false).notNull(),
    meetLink: text("meet_link"), // link do Meet/Zoom usado nas consultas virtuais
    atendimentoVirtualInfo: text("atendimento_virtual_info"), // como o atendimento virtual funciona
    modalidade: modalidadeEnum("modalidade").default("presencial").notNull(),

    // Mercado Pago Marketplace (pagamentos dos pacientes)
    mpUserId: varchar("mp_user_id", { length: 255 }),
    mpAccessToken: text("mp_access_token"),
    mpAccountAtivo: boolean("mp_account_ativo").default(false).notNull(),
    // Métodos de pagamento ATIVADOS pelo médico (subconjunto dos liberados pelo plano).
    // Valores: "credito" | "debito" | "pix" | "dinheiro".
    metodosPagamento: jsonb("metodos_pagamento").$type<string[]>().notNull().default([]),

    // Plano de assinatura com o CuidandoVC
    plano: planoEnum("plano").default("free").notNull(),

    ativo: boolean("ativo").default(true).notNull(),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  },
  (t) => [index("professionals_slug_idx").on(t.slug)],
);

// ─── professional_cards ───────────────────────────────────────────────────────
// Cards customizáveis que aparecem na página pública do médico
// (redes sociais, certificações, qualificações, localização, etc.)

export const professionalCards = pgTable(
  "professional_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),

    tipo: cardTypeEnum("tipo").notNull(),
    titulo: varchar("titulo", { length: 80 }).notNull(), // "Especialização:", "Qualificação em:"
    subtitulo: varchar("subtitulo", { length: 120 }), // "Odontopediatria", "Ortopedia Facial"
    valor: text("valor"), // URL, telefone, link Maps, etc. (interpretado por tipo)
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").default(true).notNull(),

    criadoEm: timestamp("criado_em").defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  },
  (t) => [index("cards_professional_idx").on(t.professionalId, t.ordem)],
);

// ─── services ─────────────────────────────────────────────────────────────────

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),

    nome: varchar("nome", { length: 255 }).notNull(),
    descricao: text("descricao"),
    preco: decimal("preco", { precision: 10, scale: 2 }).notNull(),
    duracaoMinutos: integer("duracao_minutos").notNull().default(30),
    modalidade: modalidadeEnum("modalidade").default("presencial").notNull(),
    ativo: boolean("ativo").default(true).notNull(),

    criadoEm: timestamp("criado_em").defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  },
  (t) => [index("services_professional_idx").on(t.professionalId)],
);

// ─── availability_rules ───────────────────────────────────────────────────────
// Regras semanais recorrentes (ex: toda segunda, 08h–18h)

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),

    diaSemana: diasSemanaEnum("dia_semana").notNull(),
    horaInicio: varchar("hora_inicio", { length: 5 }).notNull(), // "08:00"
    horaFim: varchar("hora_fim", { length: 5 }).notNull(), // "18:00"
    ativo: boolean("ativo").default(true).notNull(),
  },
  (t) => [
    index("avail_rules_professional_idx").on(t.professionalId),
    unique("avail_rules_unique").on(t.professionalId, t.diaSemana, t.horaInicio),
  ],
);

// ─── availability_blocks ──────────────────────────────────────────────────────
// Bloqueios pontuais (férias, feriados, horários específicos)

export const availabilityBlocks = pgTable(
  "availability_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),

    inicio: timestamp("inicio").notNull(),
    fim: timestamp("fim").notNull(),
    motivo: varchar("motivo", { length: 255 }),
  },
  (t) => [index("avail_blocks_professional_idx").on(t.professionalId, t.inicio)],
);

// ─── patients ─────────────────────────────────────────────────────────────────

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Paciente pode atender múltiplos profissionais — deduplicado por email
    email: varchar("email", { length: 255 }).notNull(),
    nome: varchar("nome", { length: 255 }).notNull(),
    telefone: varchar("telefone", { length: 20 }).notNull(),
    cpf: varchar("cpf", { length: 14 }), // opcional
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
  },
  (t) => [index("patients_email_idx").on(t.email), unique("patients_email_unique").on(t.email)],
);

// ─── appointments ─────────────────────────────────────────────────────────────

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),

    inicio: timestamp("inicio").notNull(),
    fim: timestamp("fim").notNull(),
    status: appointmentStatusEnum("status").default("aguardando_pagamento").notNull(),

    // Modalidade e telemedicina
    modalidade: modalidadeEnum("modalidade").default("presencial").notNull(),
    meetLink: text("meet_link"), // preenchido ao confirmar consulta online

    // Mercado Pago
    mpPreferenceId: varchar("mp_preference_id", { length: 255 }),
    mpPaymentId: varchar("mp_payment_id", { length: 255 }),
    valorPago: decimal("valor_pago", { precision: 10, scale: 2 }),

    observacoes: text("observacoes"),
    lembreteEnviadoEm: timestamp("lembrete_enviado_em"),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  },
  (t) => [
    index("appointments_professional_idx").on(t.professionalId, t.inicio),
    index("appointments_patient_idx").on(t.patientId),
    index("appointments_status_idx").on(t.status),
  ],
);

// ─── subscriptions ────────────────────────────────────────────────────────────
// Assinatura do doutor com o CuidandoVC (receita SaaS)

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id")
    .notNull()
    .unique()
    .references(() => professionals.id, { onDelete: "cascade" }),

  mpCustomerId: varchar("mp_customer_id", { length: 255 }),
  mpSubscriptionId: varchar("mp_subscription_id", { length: 255 }),
  mpPlanId: varchar("mp_plan_id", { length: 255 }),

  // Plano dinâmico assinado (tabela plans). plano (enum) é mantido como tier
  // grosseiro p/ gating legado; planId aponta o pacote real escolhido no admin.
  planId: uuid("plan_id"),

  plano: planoEnum("plano").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("trial"),

  trialFimEm: timestamp("trial_fim_em"),
  periodoInicioEm: timestamp("periodo_inicio_em"),
  periodoFimEm: timestamp("periodo_fim_em"),

  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── payments ─────────────────────────────────────────────────────────────────
// Registro de pagamentos paciente → doutor (via Stripe Connect)

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "restrict" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "restrict" }),

    mpPaymentId: varchar("mp_payment_id", { length: 255 }).notNull(),
    mpTransferId: varchar("mp_transfer_id", { length: 255 }),

    valorBruto: decimal("valor_bruto", { precision: 10, scale: 2 }).notNull(),
    taxaPlataforma: decimal("taxa_plataforma", { precision: 10, scale: 2 }).notNull(),
    valorLiquido: decimal("valor_liquido", { precision: 10, scale: 2 }).notNull(),

    status: varchar("status", { length: 50 }).notNull().default("pendente"),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
  },
  (t) => [index("payments_professional_idx").on(t.professionalId)],
);

// ─── plan_prices ──────────────────────────────────────────────────────────────
// Preço mensal de cada plano (editável pelo admin) — base de cálculo do MRR

export const planPrices = pgTable("plan_prices", {
  plano: planoEnum("plano").primaryKey(),
  valorMensal: decimal("valor_mensal", { precision: 10, scale: 2 }).notNull().default("0"),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── support_config ───────────────────────────────────────────────────────────
// Singleton — configurações de contato do suporte CuidandoVC (gerenciado pelo admin)

// ─── app_config (configurações globais do app, geridas no admin) ──────────────
// Singleton. Por enquanto guarda só o domínio do app (para quando contratar um
// domínio personalizado), mas serve de casa para futuras configs globais.

export const appConfig = pgTable("app_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  dominio: varchar("dominio", { length: 255 }), // ex: "cuidandovc.com.br" (sem protocolo)
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

export const supportConfig = pgTable("support_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  whatsappMessage: text("whatsapp_message").default("Olá, preciso de ajuda com o CuidandoVC"),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── support_faq ──────────────────────────────────────────────────────────────
// Perguntas frequentes exibidas na página de Suporte do médico. Editáveis pelo
// admin na aba Personalização do App.

export const supportFaq = pgTable("support_faq", {
  id: uuid("id").primaryKey().defaultRandom(),
  pergunta: text("pergunta").notNull(),
  resposta: text("resposta").notNull(),
  ordem: integer("ordem").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── support_tickets ──────────────────────────────────────────────────────────

export const ticketStatusEnum = pgEnum("ticket_status", [
  "aberto",
  "em_andamento",
  "resolvido",
  "fechado",
]);

export const ticketPrioridadeEnum = pgEnum("ticket_prioridade", [
  "baixa",
  "normal",
  "alta",
  "urgente",
]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    titulo: varchar("titulo", { length: 255 }).notNull(),
    status: ticketStatusEnum("status").notNull().default("aberto"),
    prioridade: ticketPrioridadeEnum("prioridade").notNull().default("normal"),
    categoria: varchar("categoria", { length: 50 }), // financeiro | tecnico | conta | outro
    lidoAdmin: boolean("lido_admin").notNull().default(false),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  },
  (t) => [index("tickets_professional_idx").on(t.professionalId, t.criadoEm)],
);

// ─── support_messages ─────────────────────────────────────────────────────────

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    autorRole: varchar("autor_role", { length: 20 }).notNull(), // 'professional' | 'admin'
    conteudo: text("conteudo").notNull(),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
  },
  (t) => [index("messages_ticket_idx").on(t.ticketId, t.criadoEm)],
);

// ─── plans ────────────────────────────────────────────────────────────────────
// Planos comerciais do CuidandoVC (Starter / Pro / Premium / White label)

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 50 }).notNull().unique(), // starter, pro, premium, white_label
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),

  precoMensal: decimal("preco_mensal", { precision: 10, scale: 2 }).notNull().default("0"),
  precoAnual: decimal("preco_anual", { precision: 10, scale: 2 }).notNull().default("0"),
  trialDias: integer("trial_dias").notNull().default(7),

  // Limites e recursos
  maxUsuarios: integer("max_usuarios").notNull().default(1), // Usuários
  maxAgendamentosMes: integer("max_agendamentos_mes").notNull().default(-1), // -1 = ilimitado
  armazenamentoGb: integer("armazenamento_gb").notNull().default(1), // Armazenamento
  comissaoPct: decimal("comissao_pct", { precision: 5, scale: 2 }).notNull().default("5"), // Comissão
  whatsappIncluso: boolean("whatsapp_incluso").notNull().default(false), // WhatsApp incluso
  recursos: jsonb("recursos").$type<string[]>().notNull().default([]), // Recursos (lista)
  // Métodos de pagamento DISPONÍVEIS neste plano (teto). O médico ativa um
  // subconjunto disso. Valores: "credito" | "debito" | "pix" | "dinheiro".
  metodosPagamento: jsonb("metodos_pagamento")
    .$type<string[]>()
    .notNull()
    .default(["credito", "debito", "pix", "dinheiro"]),

  ativo: boolean("ativo").notNull().default(true),
  ordem: integer("ordem").notNull().default(0),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── plan_features ────────────────────────────────────────────────────────────
// Matriz de funcionalidades por pacote (editável pelo admin). Permite definir,
// por plano, quais recursos estão inclusos e com qual limite. Pensado para o
// admin preencher/ajustar conforme novos pacotes e categorias forem criados.

export const planFeatures = pgTable(
  "plan_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plano: varchar("plano", { length: 50 }).notNull(), // referencia plans.slug
    chave: varchar("chave", { length: 80 }).notNull(), // ex: "lembretes_whatsapp"
    label: varchar("label", { length: 120 }).notNull(), // ex: "Lembretes por WhatsApp"
    descricao: text("descricao"),
    incluso: boolean("incluso").notNull().default(false),
    limite: integer("limite"), // null = não se aplica · -1 = ilimitado
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [
    unique("plan_features_unique").on(t.plano, t.chave),
    index("plan_features_plano_idx").on(t.plano, t.ordem),
  ],
);

// ─── delinquency_config ───────────────────────────────────────────────────────
// Singleton — regras de bloqueio progressivo por inadimplência.
// ⚠️ ativo=false por padrão: enforcement NÃO roda até o admin ligar explicitamente.

export const delinquencyConfig = pgTable("delinquency_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  ativo: boolean("ativo").notNull().default(false),
  diasAlerta: integer("dias_alerta").notNull().default(5), // Dia 5 → alerta
  diasLimitar: integer("dias_limitar").notNull().default(10), // Dia 10 → limita agenda
  diasBloquear: integer("dias_bloquear").notNull().default(20), // Dia 20 → bloqueia
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── admin_users (níveis de permissão) ────────────────────────────────────────

export const adminRoleEnum = pgEnum("admin_role", [
  "super_admin", // tudo
  "financeiro", // só cobrança
  "suporte", // só suporte
  "comercial", // só leads/clientes
  "operacional", // sem acesso financeiro
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }),
  email: varchar("email", { length: 255 }),
  role: adminRoleEnum("role").notNull().default("suporte"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

// ─── leads (CRM) ──────────────────────────────────────────────────────────────

export const leadStatusEnum = pgEnum("lead_status", [
  "novo",
  "contatado",
  "qualificado",
  "convertido",
  "perdido",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: varchar("nome", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    telefone: varchar("telefone", { length: 30 }),
    origem: varchar("origem", { length: 50 }), // instagram, indicacao, site, etc.
    status: leadStatusEnum("status").notNull().default("novo"),
    notas: text("notas"),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  },
  (t) => [index("leads_status_idx").on(t.status, t.criadoEm)],
);

// ─── feature_flags ────────────────────────────────────────────────────────────

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  chave: varchar("chave", { length: 80 }).notNull().unique(),
  descricao: text("descricao"),
  ativo: boolean("ativo").notNull().default(false),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── audit_log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorClerkId: varchar("actor_clerk_id", { length: 255 }),
    actorNome: varchar("actor_nome", { length: 255 }),
    acao: varchar("acao", { length: 100 }).notNull(),
    entidade: varchar("entidade", { length: 80 }),
    detalhe: text("detalhe"),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
  },
  (t) => [index("audit_criado_idx").on(t.criadoEm)],
);

// ─── admin_notifications ──────────────────────────────────────────────────────

export const adminNotifications = pgTable(
  "admin_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titulo: varchar("titulo", { length: 255 }).notNull(),
    mensagem: text("mensagem"),
    tipo: varchar("tipo", { length: 20 }).notNull().default("info"), // info/warning/success/error
    lida: boolean("lida").notNull().default(false),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
  },
  (t) => [index("notif_criado_idx").on(t.criadoEm)],
);

// ─── integration_config ───────────────────────────────────────────────────────
// Singleton — chaves das integrações de plataforma do CuidandoVC (Mercado Pago),
// gerenciadas pelo admin. São segredos da plataforma: acesso restrito ao admin.
// O código lê daqui primeiro; se vazio, usa a env var como fallback.

export const integrationConfig = pgTable("integration_config", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Mercado Pago — credenciais da plataforma (assinaturas dos médicos + marketplace)
  mpAccessToken: text("mp_access_token"), // APP_USR-... (produção) ou TEST-...
  mpPublicKey: text("mp_public_key"), // APP_USR-... public key
  mpAppId: varchar("mp_app_id", { length: 100 }), // Client ID do app MP
  mpAppSecret: text("mp_app_secret"), // Client Secret do app MP (OAuth marketplace)
  mpWebhookSecret: text("mp_webhook_secret"), // assinatura do webhook
  mpAmbiente: varchar("mp_ambiente", { length: 20 }).notNull().default("test"), // test | producao
  mpAtivo: boolean("mp_ativo").notNull().default(false),

  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  professional: one(professionals, {
    fields: [users.id],
    references: [professionals.userId],
  }),
  clinicsOwned: many(clinics),
}));

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  owner: one(users, { fields: [clinics.ownerUserId], references: [users.id] }),
  professionals: many(professionals),
}));

export const professionalsRelations = relations(professionals, ({ one, many }) => ({
  user: one(users, { fields: [professionals.userId], references: [users.id] }),
  clinic: one(clinics, { fields: [professionals.clinicId], references: [clinics.id] }),
  // Self-referential: clinic owner ↔ clinic members
  parentProfessional: one(professionals, {
    fields: [professionals.parentProfessionalId],
    references: [professionals.id],
    relationName: "clinic_members",
  }),
  members: many(professionals, { relationName: "clinic_members" }),
  services: many(services),
  cards: many(professionalCards),
  availabilityRules: many(availabilityRules),
  availabilityBlocks: many(availabilityBlocks),
  appointments: many(appointments),
  subscription: one(subscriptions, {
    fields: [professionals.id],
    references: [subscriptions.professionalId],
  }),
  payments: many(payments),
}));

export const professionalCardsRelations = relations(professionalCards, ({ one }) => ({
  professional: one(professionals, {
    fields: [professionalCards.professionalId],
    references: [professionals.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  professional: one(professionals, {
    fields: [services.professionalId],
    references: [professionals.id],
  }),
  appointments: many(appointments),
}));

export const availabilityRulesRelations = relations(availabilityRules, ({ one }) => ({
  professional: one(professionals, {
    fields: [availabilityRules.professionalId],
    references: [professionals.id],
  }),
}));

export const availabilityBlocksRelations = relations(availabilityBlocks, ({ one }) => ({
  professional: one(professionals, {
    fields: [availabilityBlocks.professionalId],
    references: [professionals.id],
  }),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  professional: one(professionals, {
    fields: [appointments.professionalId],
    references: [professionals.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  payment: one(payments, {
    fields: [appointments.id],
    references: [payments.appointmentId],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  professional: one(professionals, {
    fields: [subscriptions.professionalId],
    references: [professionals.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
  professional: one(professionals, {
    fields: [payments.professionalId],
    references: [professionals.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  professional: one(professionals, {
    fields: [supportTickets.professionalId],
    references: [professionals.id],
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportMessages.ticketId],
    references: [supportTickets.id],
  }),
}));
