import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { payments, professionals, users } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FinanceiroPayment = {
  id: string;
  criadoEm: Date;
  valorBruto: string;
  taxaPlataforma: string;
  valorLiquido: string;
  status: string;
  mpPaymentId: string;
  appointment: {
    patient: { nome: string; email: string };
    service: { nome: string };
  } | null;
};

export type FinanceiroData = {
  mpAccountAtivo: boolean;
  mpUserId: string | null;
  payments: FinanceiroPayment[];
  totalBruto: string;
  totalLiquido: string;
  totalTaxa: string;
  countPago: number;
  professionalId: string;
};

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthProfId(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: true },
  });
  const profId = user?.professional?.id;
  if (!profId) throw new Error("Profissional não encontrado");
  return profId;
}

// ─── fetchFinanceiroData ──────────────────────────────────────────────────────

export const fetchFinanceiroData = createServerFn({ method: "GET" }).handler(
  async (): Promise<FinanceiroData> => {
    const profId = await getAuthProfId();

    const [professional, paymentList] = await Promise.all([
      db.query.professionals.findFirst({
        where: eq(professionals.id, profId),
      }),
      db.query.payments.findMany({
        where: eq(payments.professionalId, profId),
        with: {
          appointment: {
            with: { patient: true, service: true },
          },
        },
        orderBy: [desc(payments.criadoEm)],
        limit: 200,
      }),
    ]);

    let totalBruto = 0;
    let totalLiquido = 0;
    let totalTaxa = 0;
    let countPago = 0;

    for (const p of paymentList) {
      if (p.status === "pago") {
        totalBruto += Number(p.valorBruto);
        totalLiquido += Number(p.valorLiquido);
        totalTaxa += Number(p.taxaPlataforma);
        countPago++;
      }
    }

    return {
      mpAccountAtivo: professional?.mpAccountAtivo ?? false,
      mpUserId: professional?.mpUserId ?? null,
      professionalId: profId,
      payments: paymentList.map((p) => ({
        id: p.id,
        criadoEm: p.criadoEm,
        valorBruto: p.valorBruto,
        taxaPlataforma: p.taxaPlataforma,
        valorLiquido: p.valorLiquido,
        status: p.status,
        mpPaymentId: p.mpPaymentId,
        appointment: p.appointment
          ? {
              patient: { nome: p.appointment.patient.nome, email: p.appointment.patient.email },
              service: { nome: p.appointment.service.nome },
            }
          : null,
      })),
      totalBruto: totalBruto.toFixed(2),
      totalLiquido: totalLiquido.toFixed(2),
      totalTaxa: totalTaxa.toFixed(2),
      countPago,
    };
  },
);
