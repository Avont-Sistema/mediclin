import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { z } from "zod";
import { and, count, eq, gte, sql as dsql } from "drizzle-orm";
import { db } from "../db";
import {
  professionals,
  services,
  appointments,
  patients,
  payments,
  subscriptions,
  supportTickets,
  planPrices,
  users,
  availabilityRules,
} from "../db/schema";

// ─── Guard ──────────────────────────────────────────────────────────────────
// Ponto único de autorização do admin. Hoje só exige login (gating de admin
// pendente — ver ADMIN_CLERK_IDS). Para travar de verdade no futuro, troque o
// corpo desta função por uma checagem de isAdminClerkId(auth.userId).

async function requireAdminAccess(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  // TODO(segurança): habilitar gating quando ADMIN_CLERK_IDS estiver no Vercel:
  //   const ids = (process.env.ADMIN_CLERK_IDS ?? "").split(",").map(s => s.trim());
  //   if (!ids.includes(auth.userId)) throw new Error("Acesso negado");
  return auth.userId;
}

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

export type AdminMetrics = {
  totalMedicos: number;
  novosNoMes: number;
  porPlano: { free: number; pro: number; clinic: number };
  trialAtivo: number;
  inadimplentes: number;
  churnNoMes: number;
  mrr: number;
  receitaAnualEstimada: number;
  totalPacientes: number;
  totalAgendamentos: number;
  pagamentos: { count: number; valorTotal: number };
  ticketsAbertos: number;
};

export type AdminOverview = {
  professionals: AdminProfessional[];
  totals: {
    professionals: number;
    patients: number;
    appointments: number;
  };
  metrics: AdminMetrics;
  features: {
    mp: boolean;
    resend: boolean;
    twilio: boolean;
    cron: boolean;
  };
};

export const fetchAdminOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOverview> => {
    await requireAdminAccess();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    // Load all professionals with counts
    const profs = await db.query.professionals.findMany({
      with: {
        services: { columns: { id: true } },
        appointments: { columns: { id: true, inicio: true } },
      },
      orderBy: (p, { asc }) => [asc(p.criadoEm)],
    });

    // ── Agregados em paralelo ──────────────────────────────────────────────
    const [
      [patientCount],
      [apptCount],
      [novosNoMes],
      planoRows,
      subStatusRows,
      [churnNoMes],
      [pagAgg],
      [ticketsAbertos],
      prices,
    ] = await Promise.all([
      db.select({ count: count() }).from(patients),
      db.select({ count: count() }).from(appointments),
      db
        .select({ count: count() })
        .from(professionals)
        .where(gte(professionals.criadoEm, inicioMes)),
      // Profissionais ativos agrupados por plano
      db
        .select({ plano: professionals.plano, total: count() })
        .from(professionals)
        .where(eq(professionals.ativo, true))
        .groupBy(professionals.plano),
      // Assinaturas agrupadas por status
      db
        .select({ status: subscriptions.status, total: count() })
        .from(subscriptions)
        .groupBy(subscriptions.status),
      // Cancelamentos no mês
      db
        .select({ count: count() })
        .from(subscriptions)
        .where(
          and(eq(subscriptions.status, "cancelada"), gte(subscriptions.atualizadoEm, inicioMes)),
        ),
      // Pagamentos processados (status pago)
      db
        .select({
          count: count(),
          total: dsql<string>`COALESCE(SUM(${payments.valorBruto}), 0)`,
        })
        .from(payments)
        .where(eq(payments.status, "pago")),
      // Tickets abertos (aberto + em_andamento)
      db
        .select({ count: count() })
        .from(supportTickets)
        .where(dsql`${supportTickets.status} IN ('aberto','em_andamento')`),
      db.select().from(planPrices),
    ]);

    const porPlano = { free: 0, pro: 0, clinic: 0 };
    for (const row of planoRows) porPlano[row.plano] = Number(row.total);

    const subByStatus: Record<string, number> = {};
    for (const row of subStatusRows) subByStatus[row.status] = Number(row.total);

    // MRR = soma das assinaturas ativas × preço do respectivo plano
    const priceMap: Record<string, number> = {};
    for (const p of prices) priceMap[p.plano] = Number(p.valorMensal);

    const [subAtivasPorPlano] = await Promise.all([
      db
        .select({ plano: subscriptions.plano, total: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, "ativa"))
        .groupBy(subscriptions.plano),
    ]);
    let mrr = 0;
    for (const row of subAtivasPorPlano) {
      mrr += Number(row.total) * (priceMap[row.plano] ?? 0);
    }

    const metrics: AdminMetrics = {
      totalMedicos: profs.length,
      novosNoMes: Number(novosNoMes.count),
      porPlano,
      trialAtivo: subByStatus["trial"] ?? 0,
      inadimplentes: subByStatus["inadimplente"] ?? 0,
      churnNoMes: Number(churnNoMes.count),
      mrr,
      receitaAnualEstimada: mrr * 12,
      totalPacientes: Number(patientCount.count),
      totalAgendamentos: Number(apptCount.count),
      pagamentos: { count: Number(pagAgg.count), valorTotal: Number(pagAgg.total) },
      ticketsAbertos: Number(ticketsAbertos.count),
    };

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
      metrics,
      features: {
        mp: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
        resend: !!process.env.RESEND_API_KEY,
        twilio: !!process.env.TWILIO_ACCOUNT_SID,
        cron: !!process.env.CRON_SECRET,
      },
    };
  },
);

// ─── Plan prices (editável pelo admin) ────────────────────────────────────────

export type PlanPrice = { plano: "free" | "pro" | "clinic"; valorMensal: string };

export const fetchPlanPrices = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlanPrice[]> => {
    await requireAdminAccess();
    const rows = await db.select().from(planPrices);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.plano] = r.valorMensal;
    // Garante as 3 linhas mesmo que o seed não tenha rodado
    return (["free", "pro", "clinic"] as const).map((plano) => ({
      plano,
      valorMensal: map[plano] ?? "0",
    }));
  },
);

export const updatePlanPrice = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      plano: z.enum(["free", "pro", "clinic"]),
      valorMensal: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valor inválido"),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminAccess();
    await db
      .insert(planPrices)
      .values({ plano: data.plano, valorMensal: data.valorMensal, atualizadoEm: new Date() })
      .onConflictDoUpdate({
        target: planPrices.plano,
        set: { valorMensal: data.valorMensal, atualizadoEm: new Date() },
      });
    return { ok: true };
  });

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
      { clerkId: "user_seed_ricardo", email: "dr.ricardo@cuidandovc.dev", nome: "Ricardo Fontes" },
      { clerkId: "user_seed_ana", email: "dra.ana@cuidandovc.dev", nome: "Ana Salgado" },
      { clerkId: "user_seed_joao", email: "dr.joao@cuidandovc.dev", nome: "João Tavares" },
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
