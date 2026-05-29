import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
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
    telemedicinaAtivo: boolean("telemedicina_ativo").default(false).notNull(),
    meetLink: text("meet_link"), // Google Meet / Zoom link do médico
    modalidade: modalidadeEnum("modalidade").default("presencial").notNull(),

    // Mercado Pago Marketplace (pagamentos dos pacientes)
    mpUserId: varchar("mp_user_id", { length: 255 }),
    mpAccessToken: text("mp_access_token"),
    mpAccountAtivo: boolean("mp_account_ativo").default(false).notNull(),

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

// ─── support_config ───────────────────────────────────────────────────────────
// Singleton — configurações de contato do suporte MediClin (gerenciado pelo admin)

export const supportConfig = pgTable("support_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  whatsappMessage: text("whatsapp_message").default("Olá, preciso de ajuda com o MediClin"),
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
