import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { count, eq } from "drizzle-orm";
import { db } from "../db";
import {
  professionals,
  services,
  appointments,
  patients,
  users,
  availabilityRules,
} from "../db/schema";

// ─── fetchAdminOverview ───────────────────────────────────────────────────────

export type AdminProfessional = {
  id: string;
  slug: string;
  nomeCompleto: string;
  especialidade: string;
  plano: "free" | "pro" | "clinic";
  ativo: boolean;
  servicesCount: number;
  appointmentsTotal: number;
  appointmentsHoje: number;
};

export type AdminOverview = {
  professionals: AdminProfessional[];
  totals: {
    professionals: number;
    patients: number;
    appointments: number;
  };
  features: {
    mp: boolean;
    resend: boolean;
    twilio: boolean;
    cron: boolean;
  };
};

export const fetchAdminOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOverview> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Load all professionals with counts
    const profs = await db.query.professionals.findMany({
      with: {
        services: { columns: { id: true } },
        appointments: { columns: { id: true, inicio: true } },
      },
      orderBy: (p, { asc }) => [asc(p.criadoEm)],
    });

    const [patientCount] = await db.select({ count: count() }).from(patients);
    const [apptCount] = await db.select({ count: count() }).from(appointments);

    return {
      professionals: profs.map((p) => ({
        id: p.id,
        slug: p.slug,
        nomeCompleto: p.nomeCompleto,
        especialidade: p.especialidade,
        plano: p.plano,
        ativo: p.ativo,
        servicesCount: p.services.length,
        appointmentsTotal: p.appointments.length,
        appointmentsHoje: p.appointments.filter((a) => a.inicio >= hoje && a.inicio < amanha)
          .length,
      })),
      totals: {
        professionals: profs.length,
        patients: Number(patientCount.count),
        appointments: Number(apptCount.count),
      },
      features: {
        mp: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
        resend: !!process.env.RESEND_API_KEY,
        twilio: !!process.env.TWILIO_ACCOUNT_SID,
        cron: !!process.env.CRON_SECRET,
      },
    };
  },
);

// ─── runSeed ──────────────────────────────────────────────────────────────────

export const runSeed = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");

  // Idempotent: skip if seed users already exist
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, "user_seed_ricardo"),
  });
  if (existing) return { ok: true, message: "Seed já executado" };

  const [userRicardo, userAna, userJoao] = await db
    .insert(users)
    .values([
      { clerkId: "user_seed_ricardo", email: "dr.ricardo@mediclin.dev", nome: "Ricardo Fontes" },
      { clerkId: "user_seed_ana", email: "dra.ana@mediclin.dev", nome: "Ana Salgado" },
      { clerkId: "user_seed_joao", email: "dr.joao@mediclin.dev", nome: "João Tavares" },
    ])
    .returning();

  const [profRicardo, profAna, profJoao] = await db
    .insert(professionals)
    .values([
      {
        userId: userRicardo.id,
        slug: "dr-ricardo-fontes",
        nomeCompleto: "Dr. Ricardo Fontes",
        especialidade: "Cardiologia",
        registro: "CRM 789012-SP",
        bio: "Cardiologista com 12 anos de experiência. Atendo presencialmente e por teleconsulta.",
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
        bio: "Dentista especializada em estética dental e implantes.",
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
        telefoneWhatsapp: "+5511999990003",
        plano: "free",
        ativo: true,
      },
    ])
    .returning();

  await db.insert(services).values([
    {
      professionalId: profRicardo.id,
      nome: "Consulta Cardiológica",
      descricao: "Avaliação completa com ECG.",
      preco: "450.00",
      duracaoMinutos: 60,
    },
    {
      professionalId: profRicardo.id,
      nome: "Eletrocardiograma",
      descricao: "Laudo em até 24h.",
      preco: "160.00",
      duracaoMinutos: 30,
    },
    {
      professionalId: profRicardo.id,
      nome: "Ecocardiograma",
      descricao: "Ultrassonografia do coração.",
      preco: "520.00",
      duracaoMinutos: 45,
    },
    {
      professionalId: profAna.id,
      nome: "Limpeza e Profilaxia",
      descricao: "Limpeza profissional com remoção de tártaro.",
      preco: "200.00",
      duracaoMinutos: 60,
    },
    {
      professionalId: profAna.id,
      nome: "Clareamento Dental",
      descricao: "Resultado visível na 1ª sessão.",
      preco: "1200.00",
      duracaoMinutos: 90,
    },
    {
      professionalId: profJoao.id,
      nome: "Avaliação Nutrológica",
      descricao: "Consulta completa com bioimpedância.",
      preco: "500.00",
      duracaoMinutos: 60,
    },
    {
      professionalId: profJoao.id,
      nome: "Retorno",
      descricao: "Ajuste do plano alimentar.",
      preco: "280.00",
      duracaoMinutos: 30,
    },
  ]);

  await db.insert(availabilityRules).values([
    { professionalId: profRicardo.id, diaSemana: "segunda", horaInicio: "08:00", horaFim: "18:00" },
    { professionalId: profRicardo.id, diaSemana: "terca", horaInicio: "08:00", horaFim: "18:00" },
    { professionalId: profRicardo.id, diaSemana: "quarta", horaInicio: "08:00", horaFim: "18:00" },
    { professionalId: profRicardo.id, diaSemana: "quinta", horaInicio: "08:00", horaFim: "18:00" },
    { professionalId: profRicardo.id, diaSemana: "sexta", horaInicio: "08:00", horaFim: "17:00" },
    { professionalId: profAna.id, diaSemana: "terca", horaInicio: "09:00", horaFim: "19:00" },
    { professionalId: profAna.id, diaSemana: "quarta", horaInicio: "09:00", horaFim: "19:00" },
    { professionalId: profAna.id, diaSemana: "quinta", horaInicio: "09:00", horaFim: "19:00" },
    { professionalId: profAna.id, diaSemana: "sexta", horaInicio: "09:00", horaFim: "19:00" },
    { professionalId: profAna.id, diaSemana: "sabado", horaInicio: "09:00", horaFim: "14:00" },
    { professionalId: profJoao.id, diaSemana: "segunda", horaInicio: "10:00", horaFim: "20:00" },
    { professionalId: profJoao.id, diaSemana: "quarta", horaInicio: "10:00", horaFim: "20:00" },
    { professionalId: profJoao.id, diaSemana: "sexta", horaInicio: "10:00", horaFim: "20:00" },
  ]);

  return { ok: true, message: "Seed executado com sucesso" };
});
