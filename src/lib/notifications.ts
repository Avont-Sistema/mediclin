import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { appointments, users } from "../db/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type NotificationKind =
  | "pago" // novo agendamento pago online
  | "novo" // novo agendamento confirmado sem pagamento online (dinheiro/manual)
  | "aguardando" // agendamento criado, aguardando pagamento
  | "cancelado"
  | "no_show"
  | "concluido";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  patientName: string;
  serviceName: string;
  valor: number | null;
  /** Data/hora da consulta (ISO) */
  appointmentStart: string;
  /** Quando o evento ocorreu — base para ordenação e "não lidos" (ISO) */
  occurredAt: string;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getAuthProfId(): Promise<string | null> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: true },
  });
  return user?.professional?.id ?? null;
}

function kindFor(status: string, valorPago: string | null): NotificationKind {
  switch (status) {
    case "confirmado":
      return valorPago != null ? "pago" : "novo";
    case "aguardando_pagamento":
      return "aguardando";
    case "cancelado":
      return "cancelado";
    case "no_show":
      return "no_show";
    case "concluido":
      return "concluido";
    default:
      return "novo";
  }
}

// ─── Server function ──────────────────────────────────────────────────────────
// Eventos recentes do consultório para o sino do dashboard: novos agendamentos
// (pagos ou não), cancelamentos, no-show e conclusões. Multi-tenant: só do
// profissional autenticado, ordenado pela última alteração.

export const fetchNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppNotification[]> => {
    const profId = await getAuthProfId();
    if (!profId) return [];

    const rows = await db.query.appointments.findMany({
      where: eq(appointments.professionalId, profId),
      with: { patient: true, service: true },
      orderBy: [desc(appointments.atualizadoEm)],
      limit: 25,
    });

    return rows.map((a) => ({
      id: a.id,
      kind: kindFor(a.status, a.valorPago),
      patientName: a.patient.nome,
      serviceName: a.service.nome,
      valor: a.valorPago != null ? Number(a.valorPago) : Number(a.service.preco),
      appointmentStart: a.inicio.toISOString(),
      occurredAt: a.atualizadoEm.toISOString(),
    }));
  },
);
