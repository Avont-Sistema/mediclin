/**
 * Seed de desenvolvimento — dados realistas para testes locais.
 * Execute: npm run db:seed
 * NÃO executar em produção.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ── users ──────────────────────────────────────────────────────────────────
  console.log("👤 Criando usuários...");
  const [userRicardo, userAna, userJoao] = await db
    .insert(schema.users)
    .values([
      {
        clerkId: "user_seed_ricardo",
        email: "dr.ricardo@mediclin.dev",
        nome: "Ricardo Fontes",
      },
      {
        clerkId: "user_seed_ana",
        email: "dra.ana@mediclin.dev",
        nome: "Ana Salgado",
      },
      {
        clerkId: "user_seed_joao",
        email: "dr.joao@mediclin.dev",
        nome: "João Tavares",
      },
    ])
    .onConflictDoNothing()
    .returning();

  if (!userRicardo || !userAna || !userJoao) {
    console.log("⚠️  Usuários já existem, pulando seed.");
    process.exit(0);
  }

  // ── professionals ──────────────────────────────────────────────────────────
  console.log("🩺 Criando profissionais...");
  const [profRicardo, profAna, profJoao] = await db
    .insert(schema.professionals)
    .values([
      {
        userId: userRicardo.id,
        slug: "dr-ricardo-fontes",
        nomeCompleto: "Dr. Ricardo Fontes",
        especialidade: "Cardiologia",
        registro: "CRM 789012-SP",
        bio: "Cardiologista com 12 anos de experiência, especializado em prevenção cardiovascular e check-ups executivos. Atendo presencialmente e por teleconsulta.",
        fotoUrl: null,
        telefoneWhatsapp: "+5511999990001",
        plano: "pro",
        ativo: true,
      },
      {
        userId: userAna.id,
        slug: "dra-ana-salgado",
        nomeCompleto: "Dra. Ana Salgado",
        especialidade: "Odontologia",
        registro: "CRO 345678-SP",
        bio: "Dentista especializada em estética dental e implantes. Consultório equipado com tecnologia de ponta para seu conforto.",
        fotoUrl: null,
        telefoneWhatsapp: "+5511999990002",
        plano: "pro",
        ativo: true,
      },
      {
        userId: userJoao.id,
        slug: "dr-joao-tavares",
        nomeCompleto: "Dr. João Tavares",
        especialidade: "Nutrologia",
        registro: "CRM 654321-SP",
        bio: "Nutrólogo focado em performance e emagrecimento sustentável. Atendimento 100% online.",
        fotoUrl: null,
        telefoneWhatsapp: "+5511999990003",
        plano: "free",
        ativo: true,
      },
    ])
    .returning();

  // ── services ───────────────────────────────────────────────────────────────
  console.log("💊 Criando serviços...");
  const [, , , serviceEco] = await db
    .insert(schema.services)
    .values([
      // Ricardo — Cardiologia
      {
        professionalId: profRicardo.id,
        nome: "Consulta Cardiológica",
        descricao: "Avaliação completa da saúde cardiovascular com eletrocardiograma.",
        preco: "450.00",
        duracaoMinutos: 60,
      },
      {
        professionalId: profRicardo.id,
        nome: "Eletrocardiograma (ECG)",
        descricao: "Exame de eletrocardiograma com laudo em até 24h.",
        preco: "160.00",
        duracaoMinutos: 30,
      },
      {
        professionalId: profRicardo.id,
        nome: "Teste Ergométrico",
        descricao: "Avaliação da capacidade cardiorrespiratória sob esforço físico.",
        preco: "380.00",
        duracaoMinutos: 60,
      },
      {
        professionalId: profRicardo.id,
        nome: "Ecocardiograma",
        descricao: "Ultrassonografia do coração para avaliação da estrutura e função cardíaca.",
        preco: "520.00",
        duracaoMinutos: 45,
      },
      // Ana — Odontologia
      {
        professionalId: profAna.id,
        nome: "Limpeza e Profilaxia",
        descricao: "Limpeza profissional com remoção de tártaro e polimento dental.",
        preco: "200.00",
        duracaoMinutos: 60,
      },
      {
        professionalId: profAna.id,
        nome: "Clareamento Dental",
        descricao: "Clareamento a laser com resultado visível na primeira sessão.",
        preco: "1200.00",
        duracaoMinutos: 90,
      },
      {
        professionalId: profAna.id,
        nome: "Consulta e Avaliação",
        descricao: "Avaliação inicial completa com plano de tratamento personalizado.",
        preco: "180.00",
        duracaoMinutos: 45,
      },
      // João — Nutrologia
      {
        professionalId: profJoao.id,
        nome: "Avaliação Nutrológica",
        descricao: "Consulta completa com bioimpedância e plano alimentar personalizado.",
        preco: "500.00",
        duracaoMinutos: 60,
      },
      {
        professionalId: profJoao.id,
        nome: "Retorno e Acompanhamento",
        descricao: "Consulta de retorno para ajuste do plano alimentar e suplementação.",
        preco: "280.00",
        duracaoMinutos: 30,
      },
    ])
    .returning();

  // ── availability_rules ─────────────────────────────────────────────────────
  console.log("📅 Criando regras de disponibilidade...");
  await db.insert(schema.availabilityRules).values([
    // Ricardo: Seg–Sex 08h–18h
    { professionalId: profRicardo.id, diaSemana: "segunda", horaInicio: "08:00", horaFim: "18:00" },
    { professionalId: profRicardo.id, diaSemana: "terca", horaInicio: "08:00", horaFim: "18:00" },
    { professionalId: profRicardo.id, diaSemana: "quarta", horaInicio: "08:00", horaFim: "18:00" },
    { professionalId: profRicardo.id, diaSemana: "quinta", horaInicio: "08:00", horaFim: "18:00" },
    { professionalId: profRicardo.id, diaSemana: "sexta", horaInicio: "08:00", horaFim: "17:00" },
    // Ana: Ter–Sáb 09h–19h
    { professionalId: profAna.id, diaSemana: "terca", horaInicio: "09:00", horaFim: "19:00" },
    { professionalId: profAna.id, diaSemana: "quarta", horaInicio: "09:00", horaFim: "19:00" },
    { professionalId: profAna.id, diaSemana: "quinta", horaInicio: "09:00", horaFim: "19:00" },
    { professionalId: profAna.id, diaSemana: "sexta", horaInicio: "09:00", horaFim: "19:00" },
    { professionalId: profAna.id, diaSemana: "sabado", horaInicio: "09:00", horaFim: "14:00" },
    // João: Seg/Qua/Sex 10h–20h (online)
    { professionalId: profJoao.id, diaSemana: "segunda", horaInicio: "10:00", horaFim: "20:00" },
    { professionalId: profJoao.id, diaSemana: "quarta", horaInicio: "10:00", horaFim: "20:00" },
    { professionalId: profJoao.id, diaSemana: "sexta", horaInicio: "10:00", horaFim: "20:00" },
  ]);

  // ── patients ───────────────────────────────────────────────────────────────
  console.log("🧑‍🤝‍🧑 Criando pacientes...");
  const [pacMariana, pacRafael, pacCarla, pacTiago] = await db
    .insert(schema.patients)
    .values([
      { nome: "Mariana Costa", email: "mariana.costa@email.com", telefone: "+5511988880001" },
      { nome: "Rafael Almeida", email: "rafael.almeida@email.com", telefone: "+5511988880002" },
      { nome: "Carla Mendes", email: "carla.mendes@email.com", telefone: "+5511988880003" },
      { nome: "Tiago Ribeiro", email: "tiago.ribeiro@email.com", telefone: "+5511988880004" },
      { nome: "Beatriz Lima", email: "beatriz.lima@email.com", telefone: "+5511988880005" },
    ])
    .returning();

  // ── appointments ───────────────────────────────────────────────────────────
  console.log("🗓️  Criando agendamentos...");
  const hoje = new Date();
  const d = (offset: number, h: number, m = 0) => {
    const dt = new Date(hoje);
    dt.setDate(dt.getDate() + offset);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  await db.insert(schema.appointments).values([
    {
      professionalId: profRicardo.id,
      serviceId: serviceEco.id,
      patientId: pacMariana.id,
      inicio: d(0, 8, 30),
      fim: d(0, 9, 15),
      status: "concluido",
      mpPaymentId: "pi_seed_001",
      valorPago: "520.00",
    },
    {
      professionalId: profRicardo.id,
      serviceId: serviceEco.id,
      patientId: pacRafael.id,
      inicio: d(0, 10, 0),
      fim: d(0, 10, 45),
      status: "confirmado",
      mpPaymentId: "pi_seed_002",
      valorPago: "520.00",
    },
    {
      professionalId: profRicardo.id,
      serviceId: serviceEco.id,
      patientId: pacCarla.id,
      inicio: d(1, 9, 0),
      fim: d(1, 9, 45),
      status: "confirmado",
      mpPaymentId: "pi_seed_003",
      valorPago: "520.00",
    },
    {
      professionalId: profRicardo.id,
      serviceId: serviceEco.id,
      patientId: pacTiago.id,
      inicio: d(2, 14, 0),
      fim: d(2, 14, 45),
      status: "aguardando_pagamento",
    },
  ]);

  // ── subscriptions ──────────────────────────────────────────────────────────
  console.log("💳 Criando assinaturas...");
  const trialFim = new Date();
  trialFim.setDate(trialFim.getDate() + 14);

  await db.insert(schema.subscriptions).values([
    {
      professionalId: profRicardo.id,
      plano: "pro",
      status: "ativa",
      mpCustomerId: "cus_seed_ricardo",
      mpSubscriptionId: "sub_seed_ricardo",
      periodoInicioEm: new Date(),
      periodoFimEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      professionalId: profAna.id,
      plano: "pro",
      status: "ativa",
      mpCustomerId: "cus_seed_ana",
      mpSubscriptionId: "sub_seed_ana",
      periodoInicioEm: new Date(),
      periodoFimEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      professionalId: profJoao.id,
      plano: "free",
      status: "trial",
      trialFimEm: trialFim,
    },
  ]);

  console.log("\n✅ Seed concluído com sucesso!");
  console.log("   Profissionais criados:");
  console.log(`   → dr-ricardo-fontes  (${profRicardo.id})`);
  console.log(`   → dra-ana-salgado    (${profAna.id})`);
  console.log(`   → dr-joao-tavares    (${profJoao.id})`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
