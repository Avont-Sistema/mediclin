import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  professionals,
  subscriptions,
  services,
  patients,
  appointments,
  payments,
} from "../db/schema";
import { requireAdmin } from "./admin-auth";

// ─── Modo Teste (admin) ───────────────────────────────────────────────────────
// Simula cenários de assinatura e pagamentos sem dinheiro real, para testar todo
// o comportamento do app (modo Free, PRO, cancelada, etc.) sem esperar datas.

const DIA = 86_400_000;

export type TestProfessional = {
  id: string;
  slug: string;
  nomeCompleto: string;
  plano: string;
  subStatus: string | null;
  trialFimEm: string | null;
  periodoFimEm: string | null;
};

export const fetchTestProfessionals = createServerFn({ method: "GET" }).handler(
  async (): Promise<TestProfessional[]> => {
    await requireAdmin();
    const rows = await db.query.professionals.findMany({
      with: { subscription: true },
      orderBy: (p, { desc }) => [desc(p.criadoEm)],
    });
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      nomeCompleto: p.nomeCompleto,
      plano: p.plano,
      subStatus: p.subscription?.status ?? null,
      trialFimEm: p.subscription?.trialFimEm?.toISOString() ?? null,
      periodoFimEm: p.subscription?.periodoFimEm?.toISOString() ?? null,
    }));
  },
);

export type TestScenario =
  | "trial_ativo"
  | "trial_expirado"
  | "ativa"
  | "cancelada"
  | "inadimplente";

// Campos de assinatura para cada cenário simulado.
function scenarioValues(scenario: TestScenario): {
  status: "trial" | "ativa" | "cancelada" | "inadimplente";
  trialFimEm: Date | null;
  periodoFimEm: Date | null;
} {
  const now = Date.now();
  switch (scenario) {
    case "trial_ativo":
      return { status: "trial", trialFimEm: new Date(now + 14 * DIA), periodoFimEm: null };
    case "trial_expirado":
      return { status: "trial", trialFimEm: new Date(now - DIA), periodoFimEm: null };
    case "ativa":
      return { status: "ativa", trialFimEm: null, periodoFimEm: new Date(now + 30 * DIA) };
    case "cancelada":
      // Cancelada mas ainda PRO por 10 dias (testa "ativa até o fim do período").
      return { status: "cancelada", trialFimEm: null, periodoFimEm: new Date(now + 10 * DIA) };
    case "inadimplente":
      return { status: "inadimplente", trialFimEm: null, periodoFimEm: null };
  }
}

export const simulateSubscription = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      professionalId: z.string().uuid(),
      scenario: z.enum(["trial_ativo", "trial_expirado", "ativa", "cancelada", "inadimplente"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const prof = await db.query.professionals.findFirst({
      where: eq(professionals.id, data.professionalId),
    });
    if (!prof) throw new Error("Profissional não encontrado");

    const v = scenarioValues(data.scenario);
    // Garante um tier pago para os cenários (o gating usa status + datas).
    const plano = prof.plano === "free" ? "pro" : prof.plano;

    await db
      .insert(subscriptions)
      .values({
        professionalId: data.professionalId,
        status: v.status,
        trialFimEm: v.trialFimEm,
        periodoFimEm: v.periodoFimEm,
        plano,
      })
      .onConflictDoUpdate({
        target: subscriptions.professionalId,
        set: {
          status: v.status,
          trialFimEm: v.trialFimEm,
          periodoFimEm: v.periodoFimEm,
          atualizadoEm: new Date(),
        },
      });

    return { ok: true, scenario: data.scenario };
  });

// Simula um agendamento pago (cria paciente + consulta confirmada + pagamento).
export const simulatePayment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ professionalId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();

    const svc = await db.query.services.findFirst({
      where: and(eq(services.professionalId, data.professionalId)),
    });
    if (!svc) throw new Error("O profissional precisa ter ao menos um serviço cadastrado.");

    // Paciente de teste (dedup por e-mail sintético).
    const email = `teste+${Date.now()}@cuidandovc.dev`;
    const [pat] = await db
      .insert(patients)
      .values({ nome: "Paciente de Teste", telefone: "+5511999990000", email })
      .returning();

    const inicio = new Date(Date.now() + 60 * 60 * 1000);
    const fim = new Date(inicio.getTime() + svc.duracaoMinutos * 60_000);
    const valorStr = String(svc.preco);

    const [appt] = await db
      .insert(appointments)
      .values({
        professionalId: data.professionalId,
        serviceId: svc.id,
        patientId: pat.id,
        inicio,
        fim,
        status: "confirmado",
        valorPago: valorStr,
        mpPaymentId: `TESTE-${Date.now()}`,
      })
      .returning();

    await db.insert(payments).values({
      appointmentId: appt.id,
      professionalId: data.professionalId,
      mpPaymentId: `TESTE-${Date.now()}`,
      valorBruto: valorStr,
      taxaPlataforma: "0",
      valorLiquido: valorStr,
      status: "pago",
    });

    return { ok: true, valor: valorStr, servico: svc.nome };
  });
